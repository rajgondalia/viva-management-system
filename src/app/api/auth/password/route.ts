import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { hashPassword, verifyPassword } from "@/lib/password";
import { errorResponse, HttpError } from "@/lib/http";

/** Change own password (DB users) */
export async function POST(req: Request) {
  try {
    const s = await requireUser();
    if (s.uid === 0) throw new HttpError(400, "Super admin password is set by the ADMIN_PASSWORD environment variable.");
    const { currentPassword, newPassword } = await req.json();
    if (String(newPassword || "").length < 6) throw new HttpError(400, "New password must be at least 6 characters.");
    const [u] = await db.select().from(schema.appUser).where(eq(schema.appUser.id, s.uid));
    if (!u || !verifyPassword(String(currentPassword || ""), u.passwordHash)) throw new HttpError(400, "Current password is wrong.");
    await db.update(schema.appUser).set({ passwordHash: hashPassword(String(newPassword)) }).where(eq(schema.appUser.id, s.uid));
    return NextResponse.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}
