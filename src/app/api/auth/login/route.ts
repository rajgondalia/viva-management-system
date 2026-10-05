import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { cookieOptions, SESSION_COOKIE, signSession } from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { departmentName, listDepartments } from "@/lib/departments";
import { errorResponse } from "@/lib/http";

/**
 * Login:
 *  1) Super admin from env (ADMIN_USERNAME / ADMIN_PASSWORD) - can never be locked out
 *  2) Users from AppUser table (department users / admins)
 */
export async function POST(req: Request) {
  try {
    const { username, password } = await req.json().catch(() => ({}));
    const u = String(username || "").trim().toLowerCase();
    const p = String(password || "");
    const envUser = (process.env.ADMIN_USERNAME || "admin").toLowerCase();
    const envPass = process.env.ADMIN_PASSWORD || "admin123";

    let token: string | null = null;
    if (u === envUser && p === envPass) {
      const first = (await listDepartments())[0];
      token = await signSession({ uid: 0, username: envUser, name: "Super Admin", role: "admin",
        deptId: first?.id ?? null, deptName: first?.name ?? "" });
    } else {
      const [user] = await db.select().from(schema.appUser).where(eq(sql`lower(${schema.appUser.username})`, u));
      if (user && user.isActive && verifyPassword(p, user.passwordHash)) {
        let deptId = user.departmentId;
        if (!deptId && user.role === "admin") deptId = (await listDepartments())[0]?.id ?? null;
        if (!deptId && user.role !== "admin") {
          return NextResponse.json({ error: "Your account has no department. Contact admin." }, { status: 403 });
        }
        token = await signSession({ uid: user.id, username: user.username, name: user.fullName || user.username,
          role: user.role === "admin" ? "admin" : "user", deptId, deptName: await departmentName(deptId) });
      }
    }
    if (!token) return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, cookieOptions);
    return res;
  } catch (e) { return errorResponse(e); }
}
