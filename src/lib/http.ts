import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Convert thrown errors (validation / postgres) into a friendly JSON response */
export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  const pg = (e as { code?: string; detail?: string; cause?: { code?: string; detail?: string } });
  const code = pg?.code ?? pg?.cause?.code;
  const detail = pg?.detail ?? pg?.cause?.detail ?? "";
  if (code === "23505") {
    const field = detail.match(/\("?(\w+)"?\)=/)?.[1] ?? "value";
    return NextResponse.json({ error: `A record with the same ${field} already exists.` }, { status: 409 });
  }
  if (code === "23503") {
    return NextResponse.json(
      { error: "This record is used in other records (faculty / bills). Delete or change those first." },
      { status: 409 },
    );
  }
  console.error(e);
  return NextResponse.json({ error: (e as Error)?.message || "Server error" }, { status: 500 });
}

export const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

export function num(v: unknown, field: string, { min = 0, required = true } = {}) {
  if ((v === null || v === undefined || v === "") && !required) return 0;
  const n = Number(v);
  if (!isFinite(n) || n < min) throw new HttpError(400, `${field} must be a number${min === 0 ? " (0 or more)" : ""}.`);
  return n;
}

export function reqStr(v: unknown, field: string) {
  const s = str(v);
  if (!s) throw new HttpError(400, `${field} is required.`);
  return s;
}

export function bool(v: unknown) {
  if (typeof v === "boolean") return v;
  return /^(true|yes|y|1)$/i.test(str(v));
}

export function intId(v: unknown, field: string) {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `${field} is required.`);
  return n;
}
