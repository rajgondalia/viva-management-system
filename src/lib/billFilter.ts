import { toISODate } from "@/lib/format";
import type { BillFilter } from "@/lib/bills";

export function billFilterFromParams(p: URLSearchParams): BillFilter {
  const done = p.get("done");
  return {
    from: toISODate(p.get("from")) ?? undefined,
    to: toISODate(p.get("to")) ?? undefined,
    facultyId: Number(p.get("facultyId")) || undefined,
    collegeId: Number(p.get("collegeId")) || undefined,
    q: p.get("q")?.trim() || undefined,
    done: done === "yes" || done === "no" ? done : undefined,
  };
}
