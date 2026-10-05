import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guard";
import { listDepartments } from "@/lib/departments";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await requireUser();
    return NextResponse.json({
      username: s.username, name: s.name, role: s.role, deptId: s.deptId, deptName: s.deptName,
      departments: s.role === "admin" ? await listDepartments() : [],
    });
  } catch (e) { return errorResponse(e); }
}
