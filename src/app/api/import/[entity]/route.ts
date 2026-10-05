import { NextResponse } from "next/server";
import { ENTITIES, importEntity, type Entity } from "@/lib/masters";
import { importBills } from "@/lib/bills";
import { requireDept } from "@/lib/guard";
import { errorResponse, HttpError } from "@/lib/http";

export const maxDuration = 60;

/** Body: { rows: [...] }  (Excel is parsed in the browser, rows are sent as JSON) */
export async function POST(req: Request, { params }: { params: { entity: string } }) {
  try {
    const { deptId } = await requireDept();
    const { rows } = await req.json();
    if (!Array.isArray(rows) || !rows.length) throw new HttpError(400, "The Excel sheet has no data rows.");
    if (rows.length > 5000) throw new HttpError(400, "Max 5000 rows per import.");
    if (params.entity === "bills") return NextResponse.json(await importBills(rows, deptId));
    if (!ENTITIES.includes(params.entity as Entity)) throw new HttpError(404, "Unknown table");
    return NextResponse.json(await importEntity(params.entity as Entity, rows, deptId));
  } catch (e) { return errorResponse(e); }
}
