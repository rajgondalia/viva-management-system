/** Department helpers: defaults for a new department */
import { asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export async function ensureDepartmentDefaults(deptId: number) {
  await db.insert(schema.setting).values({ id: deptId, departmentId: deptId }).onConflictDoNothing();
  const [{ c }] = (await db.execute(sql`SELECT COUNT(*)::int AS c FROM "FuelType" WHERE "DepartmentID" = ${deptId}`)).rows as { c: number }[];
  if (c === 0) {
    await db.insert(schema.fuelType).values([
      { departmentId: deptId, name: "Petrol", ratePerKM: 12 },
      { departmentId: deptId, name: "Diesel", ratePerKM: 10 },
      { departmentId: deptId, name: "CNG", ratePerKM: 8 },
      { departmentId: deptId, name: "Electric", ratePerKM: 5 },
      { departmentId: deptId, name: "Local", ratePerKM: 200, isFixedAmount: true },
    ]);
  }
}

export async function listDepartments() {
  return db.select({ id: schema.department.id, name: schema.department.name }).from(schema.department).orderBy(asc(schema.department.name));
}

export async function departmentName(id: number | null) {
  if (!id) return "";
  const [d] = await db.select().from(schema.department).where(eq(schema.department.id, id));
  return d?.name ?? "";
}
