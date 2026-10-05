/** Uploaded PDF documents (stored in Postgres bytea) */
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { HttpError } from "@/lib/http";

const { document } = schema;
export const MAX_DOC_BYTES = 4 * 1024 * 1024; // Vercel request limit is 4.5 MB

export async function saveDocument(deptId: number, file: File) {
  if (!file || typeof file === "string") throw new HttpError(400, "No file received.");
  if (file.size > MAX_DOC_BYTES) throw new HttpError(400, "PDF is too large - max 4 MB. Compress it (e.g. ilovepdf) and try again.");
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.subarray(0, 5).toString() !== "%PDF-") throw new HttpError(400, "Only PDF files are allowed.");
  // clean up abandoned uploads (not linked to anything) older than one day
  await db.execute(sql`DELETE FROM "Document" d WHERE d."DepartmentID" = ${deptId}
    AND d."CreatedAt" < now() - interval '1 day'
    AND NOT EXISTS (SELECT 1 FROM "ExternalFaculty" f WHERE f."RCDocumentID" = d."DocumentID")
    AND NOT EXISTS (SELECT 1 FROM "BankDetails" b WHERE b."ProofDocumentID" = d."DocumentID")`);
  const [row] = await db.insert(document).values({
    departmentId: deptId, fileName: file.name || "document.pdf", mimeType: "application/pdf", size: buf.length, data: buf,
  }).returning({ id: document.id, fileName: document.fileName, size: document.size });
  return row;
}

export async function getDocument(deptId: number, id: number) {
  const [row] = await db.select().from(document).where(and(eq(document.id, id), eq(document.departmentId, deptId)));
  if (!row) throw new HttpError(404, "Document not found");
  return row;
}

/** validate that a document id (optional) belongs to the department */
export async function checkDocId(deptId: number, v: unknown): Promise<number | null> {
  if (v === null || v === undefined || v === "" || v === 0) return null;
  const id = Number(v);
  const [row] = await db.select({ id: document.id }).from(document).where(and(eq(document.id, id), eq(document.departmentId, deptId)));
  if (!row) throw new HttpError(400, "Uploaded document not found - upload it again.");
  return id;
}

export async function deleteDocuments(ids: (number | null | undefined)[]) {
  const list = ids.filter((x): x is number => !!x);
  if (list.length) await db.delete(document).where(inArray(document.id, list));
}
