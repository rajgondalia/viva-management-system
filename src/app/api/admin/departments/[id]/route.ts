import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { deleteDepartment, saveDepartment } from "@/lib/admin";
import { errorResponse } from "@/lib/http";

type Ctx = { params: { id: string } };
export async function PUT(req: Request, { params }: Ctx) {
  try { await requireAdmin(); return NextResponse.json(await saveDepartment(Number(params.id), await req.json())); }
  catch (e) { return errorResponse(e); }
}
export async function DELETE(_: Request, { params }: Ctx) {
  try { await requireAdmin(); await deleteDepartment(Number(params.id)); return NextResponse.json({ ok: true }); }
  catch (e) { return errorResponse(e); }
}
