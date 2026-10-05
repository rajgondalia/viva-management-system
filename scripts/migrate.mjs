// Applies SQL migrations in ./drizzle to DATABASE_URL (runs automatically on `npm run build`)
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import fs from "node:fs";

if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
if (!process.env.DATABASE_URL) {
  console.warn("[migrate] DATABASE_URL not set - skipping migrations");
  process.exit(0);
}
const ssl = /sslmode=require|neon\.tech|supabase/.test(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : undefined;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl });
await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
// every department gets its settings row + default fuel types (only if it has none)
const { rows: depts } = await pool.query(`SELECT "DepartmentID" AS id FROM "Department"`);
for (const d of depts) {
  await pool.query(`INSERT INTO "Setting" ("SettingID","DepartmentID") VALUES ($1,$1) ON CONFLICT DO NOTHING`, [d.id]);
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM "FuelType" WHERE "DepartmentID" = $1`, [d.id]);
  if (rows[0].c === 0) {
    await pool.query(`INSERT INTO "FuelType" ("DepartmentID","FuelTypeName","RatePerKM","IsFixedAmount") VALUES
      ($1,'Petrol',12,false),($1,'Diesel',10,false),($1,'CNG',8,false),($1,'Electric',5,false),($1,'Local',200,true)`, [d.id]);
  }
}
console.log("[migrate] database is up to date");
await pool.end();
