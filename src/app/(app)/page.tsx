"use client";
/** Dashboard - KPIs, last 6 months bar chart, top colleges, recent bills */
import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Building2, FilePlus2, IndianRupee, Receipt, Users } from "lucide-react";
import { Empty, PageHeader } from "@/components/ui";
import { api } from "@/lib/client";
import { dmy, inr, inr0 } from "@/lib/format";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function Dashboard() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState("");
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => { api("/api/dashboard").then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <Empty text={err} />;
  if (!d) return <Empty text="Loading dashboard..." />;

  const max = Math.max(1, ...d.monthly.map((m: any) => m.amount));
  const tiles = [
    { k: "Total bills", v: inr0(d.bills), sub: `₹ ${inr(d.amount)} paid`, icon: Receipt },
    { k: "This month", v: `₹ ${inr0(d.monthAmount)}`, sub: `${d.monthBills} bill${d.monthBills === 1 ? "" : "s"}`, icon: IndianRupee },
    { k: "External faculty", v: inr0(d.faculty), sub: d.facultyWithoutBank ? `${d.facultyWithoutBank} without bank details` : "All have bank details", icon: Users, warn: d.facultyWithoutBank > 0 },
    { k: "Pending bills", v: inr0(d.pending), sub: `${inr0(d.colleges)} colleges in master`, icon: Building2, warn: d.pending > 0 },
  ];
  const parts = [["A. Travel", d.partA], ["B. Dearness", d.partB], ["C. Honorarium", d.partC]] as const;
  const partTotal = Math.max(1, d.partA + d.partB + d.partC);

  return (
    <div>
      <PageHeader title="Dashboard" sub="Overview of external viva examiner reimbursements">
        <Link href="/bills/new" className="btn-primary"><FilePlus2 size={16} /> Create New Bill</Link>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {tiles.map(({ k, v, sub, icon: Icon, warn }) => (
          <div key={k} className="card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{k}</span>
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon size={18} /></span>
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{v}</div>
            <div className={`mt-1 text-xs flex items-center gap-1 ${warn ? "text-amber-700" : "text-slate-500"}`}>
              {warn && <AlertTriangle size={13} />}{sub}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Monthly chart - single series bar chart */}
        <div className="card xl:col-span-2">
          <div className="card-h"><h2 className="card-t">Bill amount - last 6 months</h2></div>
          <div className="p-5">
            <div className="relative flex h-56 items-end gap-3 border-b border-slate-200" role="img" aria-label="Monthly bill amount bar chart">
              {d.monthly.map((m: any, i: number) => (
                <div key={m.label} className="relative flex h-full flex-1 flex-col justify-end items-center"
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  {hover === i && (
                    <div className="absolute -top-1 z-10 -translate-y-full rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow whitespace-nowrap">
                      <div className="font-semibold">{m.label}</div>₹ {inr(m.amount)} · {m.bills} bills
                    </div>
                  )}
                  {m.amount > 0 && i === d.monthly.length - 1 && (
                    <span className="mb-1 text-[11px] font-medium text-slate-600 tabular-nums">₹{inr0(m.amount)}</span>
                  )}
                  <div className={`w-full max-w-[44px] rounded-t transition-colors ${hover === i ? "bg-brand-600" : "bg-brand-500"}`}
                    style={{ height: `${(m.amount / max) * 85}%`, minHeight: m.amount > 0 ? 3 : 0 }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-3">
              {d.monthly.map((m: any) => <div key={m.label} className="flex-1 text-center text-xs text-slate-500">{m.label}</div>)}
            </div>
          </div>
        </div>

        {/* Split + top colleges */}
        <div className="card">
          <div className="card-h"><h2 className="card-t">Amount by part</h2></div>
          <div className="p-5 space-y-3">
            {parts.map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between text-sm"><span className="text-slate-600">{k}</span><span className="font-medium tabular-nums">₹ {inr(v)}</span></div>
                <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-500" style={{ width: `${(v / partTotal) * 100}%` }} /></div>
              </div>
            ))}
            <h3 className="pt-3 text-sm font-semibold">Top colleges</h3>
            {d.topColleges.length === 0 ? <p className="text-sm text-slate-400">No bills yet</p> : (
              <ul className="divide-y divide-slate-100 text-sm">
                {d.topColleges.map((c: any) => (
                  <li key={c.name} className="flex justify-between py-1.5"><span>{c.name} <span className="text-xs text-slate-400">({c.bills})</span></span>
                    <span className="tabular-nums">₹ {inr(c.amount)}</span></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="card mt-6">
        <div className="card-h"><h2 className="card-t">Recent bills</h2><Link href="/bills" className="text-sm text-brand-600 hover:underline">View all</Link></div>
        {d.recent.length === 0 ? <Empty text="No bills yet."><Link href="/bills/new" className="btn-primary">Create first bill</Link></Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Bill No</th><th>Date</th><th>Faculty</th><th>College</th><th className="num">Grand Total</th></tr></thead>
              <tbody>
                {d.recent.map((r: any) => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs"><Link className="hover:underline" href={`/bills/${r.id}`}>{r.billNo}</Link></td>
                    <td>{dmy(r.billDate)}</td><td className="font-medium">{r.facultyName}</td><td>{r.collegeShortName}</td>
                    <td className="num font-semibold">₹ {inr(r.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
