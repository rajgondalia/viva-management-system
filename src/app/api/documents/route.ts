import { NextResponse } from "next/server";
import { requireDept } from "@/lib/guard";
import { saveDocument } from "@/lib/documents";
import { errorResponse } from "@/lib/http";

/** multipart/form-data with field "file" (PDF) */
export async function POST(req: Request) {
  try {
    const { deptId } = await requireDept();
    const form = await req.formData();
    return NextResponse.json(await saveDocument(deptId, form.get("file") as File), { status: 201 });
  } catch (e) { return errorResponse(e); }
}
