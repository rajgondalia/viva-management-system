import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

const url = process.env.DATABASE_URL;
const ssl = url && /sslmode=require|neon\.tech|supabase/.test(url) ? { rejectUnauthorized: false } : undefined;

// Re-use one pool across hot reloads (dev) and warm serverless invocations (prod)
const g = globalThis as unknown as { __vmsPool?: Pool };
const pool = g.__vmsPool ?? new Pool({ connectionString: url, ssl, max: 5 });
g.__vmsPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
