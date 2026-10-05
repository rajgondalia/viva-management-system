import { NextResponse } from "next/server";
import { createBill, listBills } from "@/lib/bills";
import { requireDept } from "@/lib/guard";
import { errorResponse } from "@/lib/http";
import { billFilterFromParams } from "@/lib/billFilter";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { deptId } = await requireDept();
    return NextResponse.json(await listBills(billFilterFromParams(new URL(req.url).searchParams), deptId));
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: Request) {
  try { const { deptId } = await requireDept(); return NextResponse.json(await createBill(await req.json(), deptId), { status: 201 }); }
  catch (e) { return errorResponse(e); }
}
