import { NextResponse } from "next/server";
import { createEntity, ENTITIES, listEntity, type Entity } from "@/lib/masters";
import { requireDept } from "@/lib/guard";
import { errorResponse, HttpError } from "@/lib/http";

export const dynamic = "force-dynamic";
type Ctx = { params: { entity: string } };

function entityOf(p: Ctx["params"]) {
  if (!ENTITIES.includes(p.entity as Entity)) throw new HttpError(404, "Unknown table");
  return p.entity as Entity;
}

export async function GET(_: Request, { params }: Ctx) {
  try { const { deptId } = await requireDept(); return NextResponse.json(await listEntity(entityOf(params), deptId)); }
  catch (e) { return errorResponse(e); }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { deptId } = await requireDept();
    return NextResponse.json(await createEntity(entityOf(params), await req.json(), deptId), { status: 201 });
  } catch (e) { return errorResponse(e); }
}
