import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSettings } from "@/lib/bills";
import { requireDept } from "@/lib/guard";
import { errorResponse, num, reqStr } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try { const { deptId } = await requireDept(); return NextResponse.json(await getSettings(deptId)); }
  catch (e) { return errorResponse(e); }
}

export async function PUT(req: Request) {
  try {
    const { deptId } = await requireDept();
    const b = await req.json();
    await getSettings(deptId);
    const [row] = await db.update(schema.setting).set({
      instituteName: reqStr(b.instituteName, "Institute Name"),
      instituteShortName: reqStr(b.instituteShortName, "Institute Short Name"),
      place: reqStr(b.place, "Place"),
      billPrefix: reqStr(b.billPrefix, "Bill Prefix"),
      defaultPurpose: reqStr(b.defaultPurpose, "Default Purpose"),
      daNature: reqStr(b.daNature, "DA Nature of Expense"),
      daAmount: num(b.daAmount, "DA Amount"),
      honorariumBaseStudents: Math.floor(num(b.honorariumBaseStudents, "Base Students")),
      honorariumBaseAmount: num(b.honorariumBaseAmount, "Base Honorarium"),
      honorariumExtraPerStudent: num(b.honorariumExtraPerStudent, "Extra per Student"),
    }).where(eq(schema.setting.departmentId, deptId)).returning();
    return NextResponse.json(row);
  } catch (e) { return errorResponse(e); }
}
