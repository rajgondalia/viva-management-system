import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { listUsers, saveUser } from "@/lib/admin";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
export async function GET() {
  try { await requireAdmin(); return NextResponse.json(await listUsers()); } catch (e) { return errorResponse(e); }
}
export async function POST(req: Request) {
  try { await requireAdmin(); return NextResponse.json(await saveUser(null, await req.json()), { status: 201 }); }
  catch (e) { return errorResponse(e); }
}
