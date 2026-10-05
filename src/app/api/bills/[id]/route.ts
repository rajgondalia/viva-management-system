import { NextResponse } from "next/server";
import { deleteBill, getBill, setBillDone, updateBill } from "@/lib/bills";
import { requireDept } from "@/lib/guard";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

export async function GET(_: Request, { params }: Ctx) {
  try { const { deptId } = await requireDept(); return NextResponse.json(await getBill(Number(params.id), deptId)); }
  catch (e) { return errorResponse(e); }
}
export async function PUT(req: Request, { params }: Ctx) {
  try { const { deptId } = await requireDept(); return NextResponse.json(await updateBill(Number(params.id), await req.json(), deptId)); }
  catch (e) { return errorResponse(e); }
}
/** PATCH { billDone: boolean } */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { deptId } = await requireDept(); const { billDone } = await req.json();
    await setBillDone(Number(params.id), !!billDone, deptId); return NextResponse.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}
export async function DELETE(_: Request, { params }: Ctx) {
  try { const { deptId } = await requireDept(); await deleteBill(Number(params.id), deptId); return NextResponse.json({ ok: true }); }
  catch (e) { return errorResponse(e); }
}
