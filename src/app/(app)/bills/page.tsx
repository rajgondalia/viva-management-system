"use client";
/** Bill History - date-wise / faculty-wise list, date range filter, Excel import/export, PDF, edit, delete */
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, FileDown, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { Empty, PageHeader, SearchSelect, useUI } from "@/components/ui";
import { ImportDialog } from "@/components/ImportDialog";
import { api } from "@/lib/client";
import { downloadBillPdf } from "@/lib/pdf";
import { dmy, inr, todayISO } from "@/lib/format";

/* eslint-disable @typescript-eslint/no-explicit-any */
type BillRow = {
  id: number; billNo: string; billDate: string; purpose: string; facultyId: number; facultyName: string; designation: string;
  department: string; mobileNumber: string; collegeName: string; collegeShortName: string; travelMode: string; oneWayKm: number;
  totalKm: number; travelRate: number; travelAmount: number; daAmount: number; honorariumAmount: number; miscAmount: number;
  totalAmount: number; advanceAmount: number; grandTotal: number; subjectCodes: string; subjectNames: string; programs: string; students: number; billDone: boolean;
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function range(kind: string): [string, string] {
  const n = new Date();
  switch (kind) {
    case "today": return [todayISO(), todayISO()];
    case "month": return [iso(new Date(n.getFullYear(), n.getMonth(), 1)), iso(new Date(n.getFullYear(), n.getMonth() + 1, 0))];
    case "last": return [iso(new Date(n.getFullYear(), n.getMonth() - 1, 1)), iso(new Date(n.getFullYear(), n.getMonth(), 0))];
    case "ay": { // academic / financial year: 1 Apr - 31 Mar
      const y = n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1;
      return [`${y}-04-01`, `${y + 1}-03-31`];
    }
    default: return ["", ""];
  }
}

function BillsInner() {
  const params = useSearchParams();
  const { toast, confirm } = useUI();
  const [rows, setRows] = useState<BillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [facultyId, setFacultyId] = useState<number | null>(Number(params.get("facultyId")) || null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [done, setDone] = useState<"" | "yes" | "no">("");
  const [qDebounced, setQD] = useState("");
  const [group, setGroup] = useState<"date" | "faculty">(params.get("facultyId") ? "faculty" : "date");
  const [faculty, setFaculty] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [pdfBusy, setPdfBusy] = useState<number | null>(null);

  useEffect(() => { const t = setTimeout(() => setQD(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    api<any[]>("/api/masters/faculty").then(setFaculty).catch(() => {});
    api<any[]>("/api/masters/colleges").then(setColleges).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (from) p.set("from", from); if (to) p.set("to", to);
    if (facultyId) p.set("facultyId", String(facultyId)); if (collegeId) p.set("collegeId", String(collegeId));
    if (qDebounced) p.set("q", qDebounced); if (done) p.set("done", done);
    try { setRows(await api<BillRow[]>(`/api/bills?${p}`)); } catch (e) { toast((e as Error).message, "err"); }
    setLoading(false);
  }, [from, to, facultyId, collegeId, qDebounced, done, toast]);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const m = new Map<string, { title: string; sub?: string; rows: BillRow[] }>();
    for (const r of rows) {
      const key = group === "date" ? r.billDate : String(r.facultyId);
      if (!m.has(key)) m.set(key, group === "date"
        ? { title: dmy(r.billDate), sub: new Date(r.billDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long" }), rows: [] }
        : { title: r.facultyName, sub: `${r.collegeShortName} · ${r.mobileNumber}`, rows: [] });
      m.get(key)!.rows.push(r);
    }
    return Array.from(m.values());
  }, [rows, group]);

  const sum = (k: keyof BillRow, list = rows) => list.reduce((a, r) => a + Number(r[k] || 0), 0);
  const filtersOn = !!(from || to || facultyId || collegeId || q || done);

  const remove = async (r: BillRow) => {
    if (!(await confirm("Delete bill?", `Bill ${r.billNo} of ${r.facultyName} (₹ ${inr(r.grandTotal)}) will be permanently deleted.`))) return;
    try { await api(`/api/bills/${r.id}`, { method: "DELETE" }); toast("Bill deleted"); load(); }
    catch (e) { toast((e as Error).message, "err"); }
  };
  const pdf = async (id: number) => {
    setPdfBusy(id);
    try { await downloadBillPdf(id); } catch (e) { toast((e as Error).message, "err"); }
    setPdfBusy(null);
  };

  const query = () => {
    const p = new URLSearchParams();
    if (from) p.set("from", from); if (to) p.set("to", to);
    if (facultyId) p.set("facultyId", String(facultyId)); if (collegeId) p.set("collegeId", String(collegeId));
    if (qDebounced) p.set("q", qDebounced); if (done) p.set("done", done);
    return p;
  };
  /** Excel in the institute's Bill List format (server generated) for the selected date range / filters */
  const exportExcel = () => { window.location.href = `/api/bills/export?${query()}`; };
  const toggleDone = async (r: BillRow) => {
    try { await api(`/api/bills/${r.id}`, { method: "PATCH", json: { billDone: !r.billDone } });
      setRows((list) => list.map((x) => (x.id === r.id ? { ...x, billDone: !r.billDone } : x))); }
    catch (e) { toast((e as Error).message, "err"); }
  };

  const quick = (k: string) => { const [a, b] = range(k); setFrom(a); setTo(b); };
  const clear = () => { setFrom(""); setTo(""); setFacultyId(null); setCollegeId(null); setQ(""); setDone(""); };

  return (
    <div>
      <PageHeader title="Bill History" sub="All bills - date-wise or faculty-wise, with date range filter">
        <button className="btn-secondary" onClick={() => setShowImport(true)}><Upload size={16} /> Import Excel</button>
        <button className="btn-secondary" onClick={exportExcel} disabled={!rows.length}><Download size={16} /> Export Excel (Bill List format)</button>
        <Link href="/bills/new" className="btn-primary"><Plus size={16} /> New Bill</Link>
      </PageHeader>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <div><label className="label" htmlFor="from">From date</label>
            <input id="from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="label" htmlFor="to">To date</label>
            <input id="to" type="date" className="input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="col-span-2 md:col-span-1"><label className="label">Faculty</label>
            <SearchSelect options={faculty.map((f) => ({ value: f.id, label: f.name, sub: f.collegeShortName }))} value={facultyId}
              placeholder="All faculty" onChange={(o) => setFacultyId(o ? Number(o.value) : null)} /></div>
          <div className="col-span-2 md:col-span-1"><label className="label">College</label>
            <select className="input" value={collegeId ?? ""} onChange={(e) => setCollegeId(Number(e.target.value) || null)}>
              <option value="">All colleges</option>
              {colleges.map((c) => <option key={c.id} value={c.id}>{c.shortName} - {c.name}</option>)}
            </select></div>
          <div className="col-span-2"><label className="label" htmlFor="q">Search</label>
            <div className="relative"><Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input id="q" className="input pl-9" placeholder="Bill no, faculty, subject..." value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[["today", "Today"], ["month", "This month"], ["last", "Last month"], ["ay", "This year (Apr-Mar)"]].map(([k, l]) => (
            <button key={k} className="btn-secondary btn-sm" onClick={() => quick(k)}>{l}</button>
          ))}
          <select aria-label="Bill status" className="input w-auto py-1 text-xs" value={done} onChange={(e) => setDone(e.target.value as "" | "yes" | "no")}>
            <option value="">All status</option><option value="no">Pending</option><option value="yes">Done</option>
          </select>
          {filtersOn && <button className="btn-ghost btn-sm text-brand-600" onClick={clear}><X size={14} /> Clear filters</button>}
          <div className="ml-auto inline-flex rounded-lg border border-slate-300 p-0.5 text-xs">
            {(["date", "faculty"] as const).map((g) => (
              <button key={g} onClick={() => setGroup(g)}
                className={`rounded-md px-3 py-1.5 font-medium ${group === g ? "bg-brand-500 text-white" : "text-slate-600"}`}>
                {g === "date" ? "Date-wise" : "Faculty-wise"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {[["Bills", String(rows.length)], ["A. Travel", `₹ ${inr(sum("travelAmount"))}`], ["B. DA", `₹ ${inr(sum("daAmount"))}`],
          ["C. Honorarium", `₹ ${inr(sum("honorariumAmount"))}`], ["Grand Total", `₹ ${inr(sum("grandTotal"))}`]].map(([k, v], i) => (
          <div key={k} className={`card px-4 py-3 ${i === 4 ? "col-span-2 md:col-span-1 border-brand-100 bg-brand-50" : ""}`}>
            <div className="text-xs text-slate-500">{k}</div>
            <div className={`text-lg font-bold tabular-nums ${i === 4 ? "text-brand-700" : ""}`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? <Empty text="Loading..." /> : rows.length === 0 ? (
          <Empty text={filtersOn ? "No bills match these filters." : "No bills yet."}>
            <Link href="/bills/new" className="btn-primary"><Plus size={16} /> Create first bill</Link>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr>
                <th>Status</th><th>Bill No</th>{group === "faculty" && <th>Date</th>}{group === "date" && <th>Faculty</th>}
                <th>Subject(s)</th><th className="num">A. Travel</th><th className="num">B. DA</th>
                <th className="num">C. Honor.</th><th className="num">Grand Total</th><th className="text-right">Actions</th>
              </tr></thead>
              {groups.map((g) => (
                <tbody key={g.title + g.sub}>
                  <tr><td colSpan={9} className="!bg-slate-100/80 !py-2">
                    <span className="font-semibold text-slate-800">{g.title}</span>
                    <span className="ml-2 text-xs text-slate-500">{g.sub} · {g.rows.length} bill{g.rows.length > 1 ? "s" : ""}</span>
                    <span className="float-right text-sm font-semibold tabular-nums">₹ {inr(sum("grandTotal", g.rows))}</span>
                  </td></tr>
                  {g.rows.map((r) => (
                    <tr key={r.id}>
                      <td><button onClick={() => toggleDone(r)} title="Click to change"
                        className={`badge cursor-pointer ${r.billDone ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {r.billDone ? "Done" : "Pending"}</button></td>
                      <td className="font-mono text-xs whitespace-nowrap">{r.billNo}</td>
                      {group === "faculty" && <td className="whitespace-nowrap">{dmy(r.billDate)}</td>}
                      {group === "date" && <td><div className="font-medium">{r.facultyName}</div>
                        <div className="text-xs text-slate-500">{r.collegeShortName} · {r.travelMode}</div></td>}
                      <td className="max-w-[240px]"><div className="truncate" title={`${r.subjectCodes} ${r.subjectNames}`}>{r.subjectNames || "-"}</div>
                        <div className="text-xs text-slate-500">{r.programs ? `${r.programs} · ` : ""}{r.students} students</div></td>
                      <td className="num">{inr(r.travelAmount)}</td>
                      <td className="num">{inr(r.daAmount)}</td>
                      <td className="num">{inr(r.honorariumAmount)}</td>
                      <td className="num font-semibold">{inr(r.grandTotal)}</td>
                      <td className="text-right whitespace-nowrap">
                        <button className="btn-ghost btn-sm text-emerald-700" title="Download PDF" aria-label="Download PDF"
                          disabled={pdfBusy === r.id} onClick={() => pdf(r.id)}><FileDown size={15} /></button>
                        <Link href={`/bills/${r.id}`} className="btn-ghost btn-sm" title="Edit" aria-label="Edit"><Pencil size={15} /></Link>
                        <button className="btn-ghost btn-sm text-red-600" title="Delete" aria-label="Delete" onClick={() => remove(r)}><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        )}
      </div>

      {showImport && (
        <ImportDialog entity="bills" title="Bills" onClose={() => setShowImport(false)} onDone={load}
          template={[{ BillDate: todayISO(), FacultyMobile: "9876543210", FuelType: "Petrol", OneWayKM: "", CourseName: "B.Tech + Hons Sem 5", SubjectCode: "2301CS512",
            SubjectName: "Advance Flutter", NoOfStudents: 52, BillDone: "Done", ExamDate: todayISO(), AdvanceAmount: 0, Remarks: "" }]}
          notes={["One row = one bill. Faculty (by FacultyMobile) and FuelType must already exist.",
            "OneWayKM blank = college distance. All amounts are calculated automatically."]} />
      )}
    </div>
  );
}

export default function BillsPage() {
  return <Suspense fallback={<Empty text="Loading..." />}><BillsInner /></Suspense>;
}
