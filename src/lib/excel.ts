"use client";
/** Excel helpers (browser side) - SheetJS */
import * as XLSX from "xlsx";
import { toISODate } from "@/lib/format";

/** Read first sheet of an .xlsx/.xls/.csv file into JSON rows (dates normalised to YYYY-MM-DD) */
export async function readExcel(file: File): Promise<Record<string, unknown>[]> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: true });
  return rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      o[k.trim()] = v instanceof Date ? toISODate(v) : typeof v === "string" ? v.trim() : v;
    }
    return o;
  });
}

/** Download an .xlsx with one or more sheets */
export function downloadExcel(fileName: string, sheets: { name: string; rows: Record<string, unknown>[]; widths?: number[] }[]) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows);
    const keys = Object.keys(s.rows[0] || {});
    ws["!cols"] = keys.map((k, i) => ({ wch: s.widths?.[i] ?? Math.max(10, Math.min(40, k.length + 4)) }));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, fileName);
}
