import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { deleteUser, saveUser } from "@/lib/admin";
import { errorResponse, HttpError } from "@/lib/http";

type Ctx = { params: { id: string } };
export async function PUT(req: Request, { params }: Ctx) {
  try { await requireAdmin(); return NextResponse.json(await saveUser(Number(params.id), await req.json())); }
  catch (e) { return errorResponse(e); }
}
export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const s = await requireAdmin();
    if (s.uid === Number(params.id)) throw new HttpError(400, "You cannot delete your own account.");
    await deleteUser(Number(params.id)); return NextResponse.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}
