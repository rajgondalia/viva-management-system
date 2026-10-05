import { NextResponse } from "next/server";
import { deleteEntity, ENTITIES, updateEntity, type Entity } from "@/lib/masters";
import { requireDept } from "@/lib/guard";
import { errorResponse, HttpError } from "@/lib/http";

type Ctx = { params: { entity: string; id: string } };

function parse(p: Ctx["params"]) {
  if (!ENTITIES.includes(p.entity as Entity)) throw new HttpError(404, "Unknown table");
  return { entity: p.entity as Entity, id: Number(p.id) };
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { deptId } = await requireDept(); const { entity, id } = parse(params);
    return NextResponse.json(await updateEntity(entity, id, await req.json(), deptId));
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const { deptId } = await requireDept(); const { entity, id } = parse(params);
    await deleteEntity(entity, id, deptId); return NextResponse.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}
