import { requireDept } from "@/lib/guard";
import { buildBillListExcel } from "@/lib/billExcel";
import { billFilterFromParams } from "@/lib/billFilter";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET /api/bills/export?from=&to=&facultyId=&collegeId=&q=&done= -> .xlsx in the institute format */
export async function GET(req: Request) {
  try {
    const { deptId, session } = await requireDept();
    const f = billFilterFromParams(new URL(req.url).searchParams);
    const { buffer } = await buildBillListExcel(f, deptId);
    const name = `Viva_Bill_List_${session.deptName.replace(/\W+/g, "_")}_${f.from || "all"}_${f.to || ""}.xlsx`.replace(/_\.xlsx$/, ".xlsx");
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) { return errorResponse(e); }
}
