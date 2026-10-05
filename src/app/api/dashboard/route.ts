import { NextResponse } from "next/server";
import { dashboardStats } from "@/lib/bills";
import { requireDept } from "@/lib/guard";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try { const { deptId } = await requireDept(); return NextResponse.json(await dashboardStats(deptId)); }
  catch (e) { return errorResponse(e); }
}
