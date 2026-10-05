/** Departments & users management (admin only) */
import { asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { HttpError, bool, reqStr, str } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { ensureDepartmentDefaults } from "@/lib/departments";

const { department, appUser } = schema;

export async function listDepartmentsFull() {
  return db.select({
    id: department.id, name: department.name, description: department.description,
    users: sql<number>`(SELECT COUNT(*)::int FROM "AppUser" u WHERE u."DepartmentID" = "Department"."DepartmentID")`,
    faculty: sql<number>`(SELECT COUNT(*)::int FROM "ExternalFaculty" f WHERE f."DepartmentID" = "Department"."DepartmentID")`,
    bills: sql<number>`(SELECT COUNT(*)::int FROM "Bill" b WHERE b."DepartmentID" = "Department"."DepartmentID")`,
  }).from(department).orderBy(asc(department.name));
}

export async function saveDepartment(id: number | null, b: Record<string, unknown>) {
  const v = { name: reqStr(b.name, "Department Name"), description: str(b.description) };
  if (id) {
    const r = await db.update(department).set(v).where(eq(department.id, id)).returning();
    if (!r.length) throw new HttpError(404, "Department not found");
    return r[0];
  }
  const [row] = await db.insert(department).values(v).returning();
  await ensureDepartmentDefaults(row.id);
  return row;
}

export async function deleteDepartment(id: number) {
  const [d] = (await listDepartmentsFull()).filter((x) => x.id === id);
  if (!d) throw new HttpError(404, "Department not found");
  if (d.users || d.faculty || d.bills) {
    throw new HttpError(409, `Department has ${d.users} users, ${d.faculty} faculty and ${d.bills} bills - remove them first.`);
  }
  await db.delete(department).where(eq(department.id, id));
}

export async function listUsers() {
  return db.select({
    id: appUser.id, username: appUser.username, fullName: appUser.fullName, role: appUser.role,
    departmentId: appUser.departmentId, departmentName: department.name, isActive: appUser.isActive,
  }).from(appUser).leftJoin(department, eq(department.id, appUser.departmentId)).orderBy(asc(appUser.username));
}

export async function saveUser(id: number | null, b: Record<string, unknown>) {
  const username = reqStr(b.username, "Username").toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new HttpError(400, "Username: 3-40 characters, letters / numbers / . _ - only.");
  if (username === (process.env.ADMIN_USERNAME || "admin").toLowerCase()) throw new HttpError(400, "This username is reserved for the super admin.");
  const role = b.role === "admin" ? "admin" : "user";
  const departmentId = b.departmentId ? Number(b.departmentId) : null;
  if (role === "user" && !departmentId) throw new HttpError(400, "Select a department for this user.");
  const password = str(b.password);
  if (!id && password.length < 6) throw new HttpError(400, "Password must be at least 6 characters.");
  if (id && password && password.length < 6) throw new HttpError(400, "Password must be at least 6 characters.");
  const v = {
    username, fullName: str(b.fullName), role, departmentId, isActive: b.isActive === undefined ? true : bool(b.isActive),
    ...(password ? { passwordHash: hashPassword(password) } : {}),
  };
  if (id) {
    const r = await db.update(appUser).set(v).where(eq(appUser.id, id)).returning({ id: appUser.id });
    if (!r.length) throw new HttpError(404, "User not found");
    return r[0];
  }
  return (await db.insert(appUser).values({ ...v, passwordHash: hashPassword(password) }).returning({ id: appUser.id }))[0];
}

export async function deleteUser(id: number) {
  const r = await db.delete(appUser).where(eq(appUser.id, id)).returning({ id: appUser.id });
  if (!r.length) throw new HttpError(404, "User not found");
}
