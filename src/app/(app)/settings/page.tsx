"use client";
/** Settings - institute info and calculation rules (DA amount, honorarium slab) */
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Empty, PageHeader, useUI } from "@/components/ui";
import { api } from "@/lib/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
const FIELDS: { key: string; label: string; type?: "number"; help?: string; group: string }[] = [
  { group: "Institute", key: "instituteName", label: "Institute Name", help: "Used as 'To' in travel plan and on the receipt" },
  { group: "Institute", key: "instituteShortName", label: "Short Name" },
  { group: "Institute", key: "place", label: "Place", help: "Printed as Place on the bill" },
  { group: "Institute", key: "billPrefix", label: "Bill No. Prefix", help: "Bill no. = PREFIX/YEAR/0001" },
  { group: "Institute", key: "defaultPurpose", label: "Default Purpose" },
  { group: "Part B - Dearness Allowance", key: "daNature", label: "Nature of Expense" },
  { group: "Part B - Dearness Allowance", key: "daAmount", label: "DA Amount (₹, fixed)", type: "number" },
  { group: "Part C - Examination Honorarium", key: "honorariumBaseStudents", label: "Students covered by base amount", type: "number" },
  { group: "Part C - Examination Honorarium", key: "honorariumBaseAmount", label: "Base amount (₹)", type: "number" },
  { group: "Part C - Examination Honorarium", key: "honorariumExtraPerStudent", label: "Extra per student above base (₹)", type: "number" },
];

export default function SettingsPage() {
  const { toast } = useUI();
  const [s, setS] = useState<any>(null);
  useEffect(() => { api("/api/settings").then(setS).catch((e) => toast(e.message, "err")); }, [toast]);
  if (!s) return <Empty text="Loading..." />;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try { setS(await api("/api/settings", { method: "PUT", json: s })); toast("Settings saved - new bills will use these rules"); }
    catch (err) { toast((err as Error).message, "err"); }
  };
  const groups = Array.from(new Set(FIELDS.map((f) => f.group)));

  return (
    <form onSubmit={save} className="max-w-3xl">
      <PageHeader title="Settings & Rules" sub="Changing rules affects only new / re-saved bills; old bills keep their saved amounts">
        <button className="btn-primary"><Save size={16} /> Save settings</button>
      </PageHeader>
      <div className="space-y-5">
        {groups.map((g) => (
          <section key={g} className="card">
            <div className="card-h"><h2 className="card-t">{g}</h2></div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FIELDS.filter((f) => f.group === g).map((f) => (
                <div key={f.key}>
                  <label className="label" htmlFor={f.key}>{f.label}</label>
                  <input id={f.key} className="input" type={f.type ?? "text"} step="any" min={f.type ? 0 : undefined} required
                    value={s[f.key] ?? ""} onChange={(e) => setS({ ...s, [f.key]: e.target.value })} />
                  {f.help && <p className="mt-1 text-xs text-slate-500">{f.help}</p>}
                </div>
              ))}
            </div>
            {g.startsWith("Part C") && (
              <p className="px-5 pb-4 text-xs text-slate-500">
                Example: {s.honorariumBaseStudents} students → ₹{s.honorariumBaseAmount}; {Number(s.honorariumBaseStudents) + 10} students →
                ₹{s.honorariumBaseAmount} + 10 × ₹{s.honorariumExtraPerStudent} = ₹{Number(s.honorariumBaseAmount) + 10 * Number(s.honorariumExtraPerStudent)}
              </p>
            )}
          </section>
        ))}
        <section className="card p-5 text-sm text-slate-600">
          <b>Part A - Travel Allowance</b> rates are managed in <a className="text-brand-600 underline" href="/fuel-types">Fuel Types</a>:
          per-KM types pay (one-way KM × 2) × rate; fixed types (e.g. Local) pay the fixed amount.
        </section>
      </div>
    </form>
  );
}
