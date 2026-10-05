/** Server-side access checks used by every API route */
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { SESSION_COOKIE, verifySession, type Session } from "@/lib/session";

export async function getSession(): Promise<Session | null> {
  const s = await verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!s) return null;
  if (s.uid > 0) {
    // DB user: must still exist and be active; department users stay locked to their department
    const [u] = await db.select().from(schema.appUser).where(eq(schema.appUser.id, s.uid));
    if (!u || !u.isActive) return null;
    if (u.role !== "admin" && u.departmentId !== s.deptId) return null;
    if (u.role !== s.role) return null;
  }
  return s;
}

export async function requireUser() {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Not logged in");
  return s;
}

/** Returns the active department id - all data queries must be filtered by it */
export async function requireDept() {
  const s = await requireUser();
  if (!s.deptId) throw new HttpError(400, "Select a department first (top of the side menu).");
  return { session: s, deptId: s.deptId };
}

export async function requireAdmin() {
  const s = await requireUser();
  if (s.role !== "admin") throw new HttpError(403, "Only admin can do this.");
  return s;
}
