"use client";
/** Create / Edit bill screen - Part A, B, C (+ optional D) with live auto-calculation */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Car, FileDown, Plus, Save, Trash2 } from "lucide-react";
import { SearchSelect, useUI } from "@/components/ui";
import { api } from "@/lib/client";
import { calcBill, DEFAULT_SETTINGS, type CalcSettings } from "@/lib/calc";
import { amountInWords, inr, todayISO } from "@/lib/format";
import { downloadBillPdf } from "@/lib/pdf";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Faculty = { id: number; name: string; designation: string; department: string; mobileNumber: string;
  collegeId: number; collegeName: string; collegeShortName: string; distanceFromDU: number; hasBank: boolean };
type Fuel = { id: number; name: string; ratePerKM: number; isFixedAmount: boolean };
type Settings = CalcSettings & { instituteName: string; instituteShortName: string; defaultPurpose: string };

interface ExamRow { examDate: string; natureOfDuty: string; courseId: number | null; subjectId: number | null;
  subjectCode: string; subjectName: string; noOfStudents: string | number }
type Course = { id: number; name: string; shortName: string };
type Subject = { id: number; courseId: number; code: string; name: string; shortName: string };
export interface BillFormState {
  billDate: string; externalFacultyId: number | null; purpose: string; preApproval: boolean; billDone: boolean;
  travelDate: string; travelFrom: string; travelTo: string; fuelTypeId: number | null; oneWayKm: string | number;
  daDate: string; examItems: ExamRow[];
  miscDetails: string; miscAmount: string | number; miscRemarks: string; advanceAmount: string | number; remarks: string;
}

const emptyRow = (d: string, courseId: number | null = null): ExamRow =>
  ({ examDate: d, natureOfDuty: "Viva", courseId, subjectId: null, subjectCode: "", subjectName: "", noOfStudents: "" });

function blank(): BillFormState {
  const t = todayISO();
  return { billDate: t, externalFacultyId: null, purpose: "", preApproval: false, billDone: false, travelDate: t, travelFrom: "", travelTo: "",
    fuelTypeId: null, oneWayKm: "", daDate: t, examItems: [emptyRow(t)], miscDetails: "", miscAmount: "", miscRemarks: "",
    advanceAmount: "", remarks: "" };
}

export function BillForm({ billId, initial }: { billId?: number; initial?: BillFormState }) {
  const router = useRouter();
  const { toast } = useUI();
  const [f, setF] = useState<BillFormState>(initial ?? blank());
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [fuels, setFuels] = useState<Fuel[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [busy, setBusy] = useState(false);
  const [showMisc, setShowMisc] = useState(!!(initial && (Number(initial.miscAmount) || initial.miscDetails)));

  useEffect(() => {
    Promise.all([
      api<Faculty[]>("/api/masters/faculty"), api<Fuel[]>("/api/masters/fuel-types"), api<Settings>("/api/settings"),
      api<Course[]>("/api/masters/courses"), api<Subject[]>("/api/masters/subjects"),
    ]).then(([fa, fu, s, co, su]) => {
      setFaculty(fa); setFuels(fu); setSettings(s); setCourses(co); setSubjects(su);
      if (!initial) setF((p) => ({ ...p, purpose: p.purpose || s.defaultPurpose, travelTo: p.travelTo || s.instituteShortName }));
    }).catch((e) => toast(e.message, "err"));
  }, [initial, toast]);

  const fac = faculty.find((x) => x.id === f.externalFacultyId);
  const fuel = fuels.find((x) => x.id === f.fuelTypeId);
  const s: CalcSettings = settings ?? DEFAULT_SETTINGS;

  const calc = useMemo(() => calcBill({
    oneWayKm: Number(f.oneWayKm) || 0, travelRate: fuel?.ratePerKM ?? 0, isFixedTravel: !!fuel?.isFixedAmount,
    daAmount: s.daAmount, examItems: f.examItems.map((r) => ({ noOfStudents: Number(r.noOfStudents) || 0 })),
    miscAmount: Number(f.miscAmount) || 0, advanceAmount: Number(f.advanceAmount) || 0,
  }, s), [f, fuel, s]);

  const set = <K extends keyof BillFormState>(k: K, v: BillFormState[K]) => setF((p) => ({ ...p, [k]: v }));

  const setTravelDate = (d: string) => setF((p) => ({
    ...p, travelDate: d,
    daDate: p.daDate === p.travelDate ? d : p.daDate,
    examItems: p.examItems.map((r) => (r.examDate === p.travelDate ? { ...r, examDate: d } : r)),
  }));
  const setBillDate = (d: string) => {
    setF((p) => ({ ...p, billDate: d }));
    if (f.travelDate === f.billDate) setTravelDate(d);
  };
  const pickFaculty = (id: number) => {
    const x = faculty.find((y) => y.id === id);
    setF((p) => ({ ...p, externalFacultyId: id, travelFrom: x?.collegeShortName ?? "", oneWayKm: x?.distanceFromDU ?? "" }));
  };
  const setRow = (i: number, patch: Partial<ExamRow>) =>
    setF((p) => ({ ...p, examItems: p.examItems.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));

  const save = async (withPdf: boolean) => {
    if (!f.externalFacultyId) return toast("Please select External Faculty", "err");
    if (!f.fuelTypeId) return toast("Please select Fuel Type / Travel mode", "err");
    if (!f.examItems.some((r) => Number(r.noOfStudents) > 0)) return toast("Enter number of students in Part C", "err");
    const bad = f.examItems.findIndex((r) => !r.subjectId && !r.subjectCode && !r.subjectName);
    if (bad >= 0) return toast(`Select course & subject in Part C row ${bad + 1}`, "err");
    setBusy(true);
    try {
      const res = billId
        ? await api<any>(`/api/bills/${billId}`, { method: "PUT", json: f })
        : await api<any>("/api/bills", { method: "POST", json: f });
      toast(billId ? "Bill updated" : `Bill ${res.billNo} created`);
      if (withPdf) await downloadBillPdf(res.id);
      router.push("/bills");
      router.refresh();
    } catch (e) { toast((e as Error).message, "err"); setBusy(false); }
  };

  const facOptions = faculty.map((x) => ({ value: x.id, label: x.name, sub: `${x.collegeShortName} · ${x.mobileNumber}` }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
      {/* ================= LEFT : form ================= */}
      <div className="xl:col-span-2 space-y-5">
        {/* Header */}
        <section className="card p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="fac">External Faculty <span className="text-brand-500">*</span></label>
              <SearchSelect id="fac" options={facOptions} value={f.externalFacultyId} placeholder="Search faculty by name / college / mobile"
                onChange={(o) => o && pickFaculty(Number(o.value))} />
            </div>
            <div>
              <label className="label" htmlFor="bdate">Bill Date <span className="text-brand-500">*</span></label>
              <input id="bdate" type="date" className="input" value={f.billDate} onChange={(e) => setBillDate(e.target.value)} />
            </div>
          </div>

          {fac && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
              <Info k="Designation" v={fac.designation || "-"} />
              <Info k="Department" v={fac.department || "-"} />
              <Info k="Mobile" v={fac.mobileNumber} />
              <Info k="Institute" v={`${fac.collegeName} (${fac.distanceFromDU} km)`} />
              {!fac.hasBank && (
                <p className="col-span-full flex items-center gap-1.5 text-xs text-amber-700">
                  <AlertTriangle size={14} /> Bank details missing for this faculty -
                  <Link href="/bank-details" className="underline">add bank details</Link> so they print on the bill.
                </p>
              )}
            </div>
          )}
          {!faculty.length && settings && (
            <p className="mt-3 text-xs text-amber-700">No faculty yet. <Link className="underline" href="/faculty">Add faculty first</Link>.</p>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className="label" htmlFor="purpose">Purpose</label>
              <input id="purpose" className="input" value={f.purpose} onChange={(e) => set("purpose", e.target.value)} />
            </div>
            <div className="sm:col-span-3 grid grid-cols-2 gap-4 max-w-md">
              {([["preApproval", "Pre-approval", "Yes", "No"], ["billDone", "Bill Done", "Done", "Pending"]] as const).map(([k, l, yes, no]) => (
                <div key={k}>
                  <span className="label">{l}</span>
                  <div className="flex gap-1">
                    {[true, false].map((v) => (
                      <button key={String(v)} type="button" onClick={() => set(k, v)}
                        className={`btn flex-1 border px-2 ${f[k] === v ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 bg-white text-slate-600"}`}>
                        {v ? yes : no}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Part A */}
        <section className="card">
          <div className="card-h"><h2 className="card-t flex items-center gap-2"><span className="part-tag">A</span> Travel Allowance</h2>
            <span className="text-sm font-semibold tabular-nums">₹ {inr(calc.partA)}</span></div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="label" htmlFor="tdate">Travel Date</label>
              <input id="tdate" type="date" className="input" value={f.travelDate} onChange={(e) => setTravelDate(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="fuel">Fuel Type / Mode <span className="text-brand-500">*</span></label>
              <select id="fuel" className="input" value={f.fuelTypeId ?? ""} onChange={(e) => set("fuelTypeId", Number(e.target.value) || null)}>
                <option value="">Select...</option>
                {fuels.map((x) => <option key={x.id} value={x.id}>{x.name} - ₹{x.ratePerKM}{x.isFixedAmount ? " fixed" : "/km"}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="km">One-way KM</label>
              <input id="km" type="number" min={0} step="any" className="input" value={f.oneWayKm} disabled={fuel?.isFixedAmount}
                onChange={(e) => set("oneWayKm", e.target.value)} />
            </div>
            <div>
              <label className="label">Rate</label>
              <input className="input" readOnly value={fuel ? (fuel.isFixedAmount ? `₹${fuel.ratePerKM} fixed` : `₹${fuel.ratePerKM} / km`) : ""} />
            </div>
            <div className="col-span-2">
              <label className="label" htmlFor="from">From</label>
              <input id="from" className="input" value={f.travelFrom} onChange={(e) => set("travelFrom", e.target.value)} placeholder="College short name" />
            </div>
            <div className="col-span-2">
              <label className="label" htmlFor="to">To</label>
              <input id="to" className="input" value={f.travelTo} onChange={(e) => set("travelTo", e.target.value)} />
            </div>
          </div>
          {fuel && (
            <div className="px-5 pb-5 overflow-x-auto">
              <table className="tbl rounded-lg border border-slate-200">
                <thead><tr><th>From</th><th>To</th><th>Mode</th><th className="num">KM</th><th className="num">Rate</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  {fuel.isFixedAmount ? (
                    <tr><td>{f.travelFrom || "-"}</td><td>{f.travelTo}</td><td>{fuel.name}</td><td className="num">-</td>
                      <td className="num">Fixed</td><td className="num">{inr(calc.travel.amount)}</td></tr>
                  ) : (<>
                    <tr><td>{f.travelFrom || "-"}</td><td>{f.travelTo}</td><td>Car - {fuel.name}</td>
                      <td className="num">{calc.travel.oneWayKm}</td><td className="num">{fuel.ratePerKM}</td><td className="num">{inr(calc.travel.oneWayAmount)}</td></tr>
                    <tr><td>{f.travelTo}</td><td>{f.travelFrom || "-"}</td><td>Car - {fuel.name}</td>
                      <td className="num">{calc.travel.oneWayKm}</td><td className="num">{fuel.ratePerKM}</td><td className="num">{inr(calc.travel.oneWayAmount)}</td></tr>
                  </>)}
                  <tr className="font-semibold"><td colSpan={3} className="text-right">Total</td>
                    <td className="num">{fuel.isFixedAmount ? "-" : calc.travel.totalKm}</td><td /><td className="num">{inr(calc.partA)}</td></tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Part B */}
        <section className="card">
          <div className="card-h"><h2 className="card-t flex items-center gap-2"><span className="part-tag">B</span> Dearness Allowance</h2>
            <span className="text-sm font-semibold tabular-nums">₹ {inr(calc.partB)}</span></div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="label" htmlFor="dadate">Date</label>
              <input id="dadate" type="date" className="input" value={f.daDate} onChange={(e) => set("daDate", e.target.value)} />
            </div>
            <div><label className="label">Nature of Expense</label><input className="input" readOnly value={settings?.daNature ?? "Viva"} /></div>
            <div><label className="label">Rate</label><input className="input" readOnly value={s.daAmount} /></div>
            <div><label className="label">Total Amount</label><input className="input font-semibold" readOnly value={inr(calc.partB)} /></div>
          </div>
        </section>

        {/* Part C */}
        <section className="card">
          <div className="card-h">
            <h2 className="card-t flex items-center gap-2"><span className="part-tag">C</span> Examination Honorarium</h2>
            <span className="text-sm font-semibold tabular-nums">₹ {inr(calc.partC)}</span>
          </div>
          <p className="px-5 pt-3 text-xs text-slate-500">
            Select one or more courses and subjects. Honorarium is calculated on the <b>total students</b>: up to {s.honorariumBaseStudents} = ₹{s.honorariumBaseAmount};
            above that ₹{s.honorariumExtraPerStudent} per extra student.
            {!courses.length && settings && <> No courses yet - <Link className="underline text-brand-600" href="/courses">add courses</Link> and <Link className="underline text-brand-600" href="/subjects">subjects</Link>.</>}
          </p>
          <div className="p-5 pt-3 space-y-3">
            {f.examItems.map((r, i) => {
              const subs = subjects.filter((x) => x.courseId === r.courseId);
              const legacy = !r.subjectId && (r.subjectCode || r.subjectName);
              return (
                <div key={i} className="rounded-lg border border-slate-200 p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-12 gap-3">
                    <div className="col-span-2 sm:col-span-5"><label className="label" htmlFor={`course-${i}`}>Course *</label>
                      <select id={`course-${i}`} className="input" value={r.courseId ?? ""}
                        onChange={(e) => setRow(i, { courseId: Number(e.target.value) || null, subjectId: null, subjectCode: "", subjectName: "" })}>
                        <option value="">Select course...</option>
                        {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select></div>
                    <div className="col-span-2 sm:col-span-7"><label className="label" htmlFor={`subject-${i}`}>Subject *</label>
                      <select id={`subject-${i}`} className="input" value={r.subjectId ?? ""} disabled={!r.courseId}
                        onChange={(e) => { const x = subjects.find((y) => y.id === Number(e.target.value));
                          setRow(i, { subjectId: x?.id ?? null, subjectCode: x?.code ?? "", subjectName: x?.name ?? "" }); }}>
                        <option value="">{r.courseId ? (subs.length ? "Select subject..." : "No subjects in this course") : "Select course first"}</option>
                        {subs.map((x) => <option key={x.id} value={x.id}>{x.code} - {x.shortName || x.name}{x.shortName && x.shortName !== x.name ? ` (${x.name})` : ""}</option>)}
                      </select>
                      {legacy && <p className="mt-1 text-xs text-amber-700">Saved earlier as: {r.subjectCode} {r.subjectName}</p>}
                    </div>
                    <div className="sm:col-span-4"><label className="label">Date</label>
                      <input type="date" className="input" value={r.examDate} onChange={(e) => setRow(i, { examDate: e.target.value })} /></div>
                    <div className="sm:col-span-4"><label className="label">Nature of Duty</label>
                      <input className="input" value={r.natureOfDuty} onChange={(e) => setRow(i, { natureOfDuty: e.target.value })} /></div>
                    <div className="col-span-2 sm:col-span-4"><label className="label" htmlFor={`stu-${i}`}>No. of Students *</label>
                      <div className="flex gap-1">
                        <input id={`stu-${i}`} type="number" min={0} className="input" value={r.noOfStudents} onChange={(e) => setRow(i, { noOfStudents: e.target.value })} />
                        {f.examItems.length > 1 && (
                          <button type="button" className="btn-ghost px-2 text-red-600" aria-label="Remove row" title="Remove"
                            onClick={() => set("examItems", f.examItems.filter((_, j) => j !== i))}><Trash2 size={15} /></button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" className="btn-secondary btn-sm"
                onClick={() => set("examItems", [...f.examItems, emptyRow(f.travelDate, f.examItems[f.examItems.length - 1]?.courseId ?? null)])}>
                <Plus size={14} /> Add course / subject
              </button>
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm tabular-nums">
                Total students <b>{calc.totalStudents}</b>
                {calc.honorarium.amount > 0 && <span className="text-slate-500"> · {calc.honorarium.extraStudents > 0
                  ? <>₹{inr(calc.honorarium.baseAmount)} + {calc.honorarium.extraStudents} × ₹{s.honorariumExtraPerStudent}</>
                  : <>up to {s.honorariumBaseStudents} students</>} = </span>}
                <b className="text-slate-900"> ₹ {inr(calc.partC)}</b>
              </div>
            </div>
          </div>
        </section>

        {/* Part D (optional) */}
        <section className="card">
          <div className="card-h">
            <h2 className="card-t flex items-center gap-2"><span className="part-tag bg-slate-400">D</span> Miscellaneous <span className="text-xs font-normal text-slate-400">(optional)</span></h2>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setShowMisc(!showMisc)}>{showMisc ? "Hide" : "Add"}</button>
          </div>
          {showMisc && (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2"><label className="label">Details</label>
                <input className="input" value={f.miscDetails} onChange={(e) => set("miscDetails", e.target.value)} /></div>
              <div><label className="label">Amount</label>
                <input type="number" min={0} className="input" value={f.miscAmount} onChange={(e) => set("miscAmount", e.target.value)} /></div>
              <div><label className="label">Remarks</label>
                <input className="input" value={f.miscRemarks} onChange={(e) => set("miscRemarks", e.target.value)} /></div>
            </div>
          )}
        </section>
      </div>

      {/* ================= RIGHT : summary ================= */}
      <aside className="card xl:sticky xl:top-6">
        <div className="card-h"><h2 className="card-t">Summary</h2>{fuel && <Car size={18} className="text-slate-400" />}</div>
        <div className="p-5 space-y-2.5 text-sm">
          <Line k="A. Travel Allowance" v={calc.partA} />
          <Line k="B. Dearness Allowance" v={calc.partB} />
          <Line k="C. Examination Honorarium" v={calc.partC} />
          {calc.partD > 0 && <Line k="D. Miscellaneous" v={calc.partD} />}
          <div className="border-t border-slate-200 pt-2.5"><Line k="Total (A+B+C+D)" v={calc.total} bold /></div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="adv" className="text-slate-600">Advance received</label>
            <input id="adv" type="number" min={0} className="input w-28 text-right py-1.5" value={f.advanceAmount}
              onChange={(e) => set("advanceAmount", e.target.value)} placeholder="0" />
          </div>
          <div className="rounded-lg bg-brand-50 px-4 py-3 mt-2">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-brand-900">Grand Total</span>
              <span className="text-2xl font-bold text-brand-700 tabular-nums">₹ {inr(calc.grandTotal)}</span>
            </div>
            <p className="mt-1 text-xs text-brand-900/70">Rupees {amountInWords(calc.grandTotal)} only</p>
          </div>
          <div><label className="label mt-2" htmlFor="rem">Remarks</label>
            <textarea id="rem" rows={2} className="input" value={f.remarks} onChange={(e) => set("remarks", e.target.value)} /></div>
        </div>
        <div className="border-t border-slate-100 p-4 flex flex-col gap-2">
          <button className="btn-primary w-full" disabled={busy} onClick={() => save(true)}><FileDown size={16} /> {billId ? "Update" : "Save"} & Download PDF</button>
          <button className="btn-secondary w-full" disabled={busy} onClick={() => save(false)}><Save size={16} /> {billId ? "Update Bill" : "Save Bill"}</button>
          <Link href="/bills" className="btn-ghost w-full"><ArrowLeft size={16} /> Back to bills</Link>
        </div>
      </aside>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return <div><div className="text-[11px] uppercase tracking-wide text-slate-400">{k}</div><div className="font-medium truncate" title={v}>{v}</div></div>;
}
function Line({ k, v, bold }: { k: string; v: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? "font-semibold text-slate-900" : "text-slate-600"}`}>
      <span>{k}</span><span className="tabular-nums">₹ {inr(v)}</span>
    </div>
  );
}
