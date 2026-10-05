import { requireDept } from "@/lib/guard";
import { getDocument } from "@/lib/documents";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { deptId } = await requireDept();
    const d = await getDocument(deptId, Number(params.id));
    const download = new URL(req.url).searchParams.has("download");
    return new Response(new Uint8Array(d.data), {
      headers: {
        "Content-Type": d.mimeType,
        "Content-Length": String(d.size),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(d.fileName)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) { return errorResponse(e); }
}
