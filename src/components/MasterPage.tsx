"use client";
/** Generic CRUD page for master tables (list + search + add/edit modal + delete + Excel import/export) */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { Empty, Modal, PageHeader, SearchSelect, useUI, type Option } from "@/components/ui";
import { ImportDialog } from "@/components/ImportDialog";
import { PdfField } from "@/components/PdfField";
import { api } from "@/lib/client";
import { downloadExcel } from "@/lib/excel";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface Field {
  key: string; label: string; type?: "text" | "number" | "select" | "checkbox" | "tel" | "file";
  required?: boolean; placeholder?: string; help?: string; full?: boolean;
  /** for select: entity to load options from + label builder */
  optionsFrom?: string; optionLabel?: (r: Row) => string; optionSub?: (r: Row) => string;
  upper?: boolean;
}
export interface Column { key: string; label: string; num?: boolean; render?: (r: Row) => React.ReactNode }

export interface MasterConfig {
  entity: string; title: string; singular: string; sub: string;
  fields: Field[]; columns: Column[];
  searchKeys: string[];
  defaults?: Row;
  importTemplate: Row[]; importNotes?: string[];
  exportRow: (r: Row) => Row;
  rowActions?: (r: Row) => React.ReactNode;
}

export function MasterPage({ cfg }: { cfg: MasterConfig }) {
  const { toast, confirm } = useUI();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Row | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [options, setOptions] = useState<Record<string, Option[]>>({});

  const load = useCallback(async () => {
    try { setRows(await api<Row[]>(`/api/masters/${cfg.entity}`)); }
    catch (e) { toast((e as Error).message, "err"); }
    setLoading(false);
  }, [cfg.entity, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const v = new URLSearchParams(window.location.search).get("q"); if (v) setQ(v); }, []);

  // load dropdown options for select fields when the form opens
  useEffect(() => {
    if (!edit) return;
    cfg.fields.filter((f) => f.optionsFrom).forEach(async (f) => {
      const list = await api<Row[]>(`/api/masters/${f.optionsFrom}`);
      setOptions((o) => ({ ...o, [f.key]: list.map((r) => ({ value: r.id, label: f.optionLabel!(r), sub: f.optionSub?.(r) })) }));
    });
  }, [edit, cfg.fields]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => cfg.searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(s)));
  }, [rows, q, cfg.searchKeys]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    try {
      if (edit.id) await api(`/api/masters/${cfg.entity}/${edit.id}`, { method: "PUT", json: edit });
      else await api(`/api/masters/${cfg.entity}`, { method: "POST", json: edit });
      toast(`${cfg.singular} ${edit.id ? "updated" : "added"} successfully`);
      setEdit(null);
      load();
    } catch (err) { toast((err as Error).message, "err"); }
  };

  const remove = async (r: Row) => {
    if (!(await confirm(`Delete ${cfg.singular}?`, `This will permanently delete "${r.name ?? r.nameAsPerBank}".`))) return;
    try { await api(`/api/masters/${cfg.entity}/${r.id}`, { method: "DELETE" }); toast(`${cfg.singular} deleted`); load(); }
    catch (err) { toast((err as Error).message, "err"); }
  };

  return (
    <div>
      <PageHeader title={cfg.title} sub={cfg.sub}>
        <button className="btn-secondary" onClick={() => setShowImport(true)}><Upload size={16} /> Import Excel</button>
        <button className="btn-secondary" disabled={!rows.length}
          onClick={() => downloadExcel(`${cfg.entity}.xlsx`, [{ name: cfg.title, rows: rows.map(cfg.exportRow) }])}>
          <Download size={16} /> Export
        </button>
        <button className="btn-primary" onClick={() => setEdit({ ...(cfg.defaults || {}) })}><Plus size={16} /> Add {cfg.singular}</button>
      </PageHeader>

      <div className="card">
        <div className="card-h">
          <div className="relative w-full max-w-xs">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input className="input pl-9" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <span className="text-xs text-slate-500">{filtered.length} of {rows.length}</span>
        </div>
        <div className="overflow-x-auto">
          {loading ? <Empty text="Loading..." /> : filtered.length === 0 ? (
            <Empty text={rows.length ? "No records match your search." : `No ${cfg.title.toLowerCase()} yet. Add one or import from Excel.`} />
          ) : (
            <table className="tbl">
              <thead><tr>
                <th className="w-12">#</th>
                {cfg.columns.map((c) => <th key={c.key} className={c.num ? "num" : ""}>{c.label}</th>)}
                <th className="w-28 text-right">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id}>
                    <td className="text-slate-400">{i + 1}</td>
                    {cfg.columns.map((c) => <td key={c.key} className={c.num ? "num" : ""}>{c.render ? c.render(r) : r[c.key]}</td>)}
                    <td className="text-right whitespace-nowrap">
                      {cfg.rowActions?.(r)}
                      <button className="btn-ghost btn-sm" title="Edit" aria-label="Edit" onClick={() => setEdit({ ...r })}><Pencil size={15} /></button>
                      <button className="btn-ghost btn-sm text-red-600" title="Delete" aria-label="Delete" onClick={() => remove(r)}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {edit && (
        <Modal title={`${edit.id ? "Edit" : "Add"} ${cfg.singular}`} onClose={() => setEdit(null)}>
          <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cfg.fields.map((f) => (
              <div key={f.key} className={f.full || f.type === "select" || f.type === "file" ? "sm:col-span-2" : ""}>
                {f.type === "file" ? (
                  <>
                    <span className="label">{f.label}</span>
                    <PdfField value={edit[f.key] ?? null} onChange={(id) => setEdit({ ...edit, [f.key]: id })} />
                  </>
                ) : f.type === "checkbox" ? (
                  <label className="flex items-center gap-2 text-sm mt-1">
                    <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={!!edit[f.key]}
                      onChange={(e) => setEdit({ ...edit, [f.key]: e.target.checked })} />
                    {f.label}
                  </label>
                ) : (
                  <>
                    <label className="label" htmlFor={`f-${f.key}`}>{f.label}{f.required && <span className="text-brand-500"> *</span>}</label>
                    {f.type === "select" ? (
                      <SearchSelect id={`f-${f.key}`} options={options[f.key] || []} value={edit[f.key]}
                        placeholder={f.placeholder} onChange={(o) => setEdit({ ...edit, [f.key]: o?.value })} />
                    ) : (
                      <input id={`f-${f.key}`} className={`input ${f.upper ? "uppercase" : ""}`}
                        type={f.type === "number" ? "number" : f.type === "tel" ? "tel" : "text"}
                        step={f.type === "number" ? "any" : undefined} min={f.type === "number" ? 0 : undefined}
                        required={f.required} placeholder={f.placeholder} value={edit[f.key] ?? ""}
                        onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} />
                    )}
                  </>
                )}
                {f.help && <p className="mt-1 text-xs text-slate-500">{f.help}</p>}
              </div>
            ))}
            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setEdit(null)}>Cancel</button>
              <button type="submit" className="btn-primary">{edit.id ? "Update" : "Save"}</button>
            </div>
          </form>
        </Modal>
      )}

      {showImport && (
        <ImportDialog entity={cfg.entity} title={cfg.title} template={cfg.importTemplate} notes={cfg.importNotes}
          onClose={() => setShowImport(false)} onDone={load} />
      )}
    </div>
  );
}
