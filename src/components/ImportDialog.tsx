"use client";
/** Excel import dialog: template download -> choose file -> preview -> import -> result report */
import { useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { Modal, useUI } from "@/components/ui";
import { api } from "@/lib/client";
import { downloadExcel, readExcel } from "@/lib/excel";

interface Result { inserted: number; updated: number; errors: { row: number; message: string }[] }

export function ImportDialog({ entity, title, template, notes, onClose, onDone }: {
  entity: string; title: string; template: Record<string, unknown>[]; notes?: string[];
  onClose: () => void; onDone: () => void;
}) {
  const { toast } = useUI();
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const choose = async (f?: File) => {
    if (!f) return;
    try { setRows(await readExcel(f)); setFileName(f.name); setResult(null); }
    catch { toast("Could not read this file. Use .xlsx, .xls or .csv", "err"); }
  };
  const run = async () => {
    if (!rows?.length) return;
    setBusy(true);
    try {
      const r = await api<Result>(`/api/import/${entity}`, { method: "POST", json: { rows } });
      setResult(r);
      toast(`Imported: ${r.inserted} new, ${r.updated} updated${r.errors.length ? `, ${r.errors.length} errors` : ""}`,
        r.errors.length ? "err" : "ok");
      onDone();
    } catch (e) { toast((e as Error).message, "err"); }
    setBusy(false);
  };
  const cols = rows?.length ? Object.keys(rows[0]) : [];

  return (
    <Modal title={`Import ${title} from Excel`} onClose={onClose} size="lg">
      <ol className="text-sm text-slate-600 space-y-1.5 list-decimal pl-5">
        <li>Download the template, fill one record per row (keep the header row).
          <button className="btn-ghost btn-sm ml-2 text-brand-600" type="button"
            onClick={() => downloadExcel(`${entity}-template.xlsx`, [{ name: title, rows: template }])}>
            <Download size={14} /> Template
          </button>
        </li>
        <li>Choose the file and check the preview, then click Import.</li>
        {notes?.map((n) => <li key={n}>{n}</li>)}
      </ol>

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-8 hover:border-brand-500 hover:bg-brand-50/40"
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); choose(e.dataTransfer.files[0]); }}>
        <FileSpreadsheet className="text-emerald-600" size={32} />
        <span className="text-sm font-medium">{fileName || "Click or drop an Excel file here"}</span>
        <span className="text-xs text-slate-400">.xlsx · .xls · .csv</span>
        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
      </label>

      {rows && (
        <div className="mt-4">
          <p className="text-xs text-slate-500 mb-1.5">{rows.length} rows found · preview (first 5)</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="tbl text-xs">
              <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>{rows.slice(0, 5).map((r, i) => (
                <tr key={i}>{cols.map((c) => <td key={c}>{String(r[c] ?? "")}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
          <b className="text-emerald-700">{result.inserted} added</b>, <b className="text-sky-700">{result.updated} updated</b>
          {result.errors.length > 0 && <>, <b className="text-red-600">{result.errors.length} failed</b></>}
          {result.errors.length > 0 && (
            <ul className="mt-2 max-h-40 overflow-y-auto text-xs text-red-700 space-y-0.5">
              {result.errors.map((e) => <li key={e.row}>Row {e.row}: {e.message}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>{result ? "Close" : "Cancel"}</button>
        <button className="btn-primary" disabled={!rows?.length || busy} onClick={run}>
          <Upload size={16} /> {busy ? "Importing..." : `Import ${rows?.length ?? ""} rows`}
        </button>
      </div>
    </Modal>
  );
}
