import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { departmentName } from "@/lib/departments";
import { cookieOptions, SESSION_COOKIE, signSession } from "@/lib/session";
import { errorResponse, HttpError, intId } from "@/lib/http";

/** Admin: switch the active department */
export async function POST(req: Request) {
  try {
    const s = await requireAdmin();
    const { departmentId } = await req.json();
    const id = intId(departmentId, "Department");
    const name = await departmentName(id);
    if (!name) throw new HttpError(404, "Department not found");
    const { exp: _exp, ...rest } = s; // eslint-disable-line @typescript-eslint/no-unused-vars
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, await signSession({ ...rest, deptId: id, deptName: name }), cookieOptions);
    return res;
  } catch (e) { return errorResponse(e); }
}
