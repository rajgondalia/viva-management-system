"use client";
import { MasterPage, type MasterConfig } from "@/components/MasterPage";
import { inr0 } from "@/lib/format";

const cfg: MasterConfig = {
  entity: "fuel-types", title: "Fuel Types", singular: "Fuel Type",
  sub: "Per-KM rates for car travel. Tick 'Fixed amount' for Local (e.g. fixed ₹200)",
  searchKeys: ["name"],
  defaults: { isFixedAmount: false },
  fields: [
    { key: "name", label: "Fuel Type Name", required: true, placeholder: "Petrol" },
    { key: "ratePerKM", label: "Rate Per KM / Fixed Amount (₹)", type: "number", required: true, placeholder: "12" },
    { key: "isFixedAmount", label: "Fixed amount (not per KM) - e.g. Local", type: "checkbox", full: true,
      help: "When ticked, the rate above is paid as a fixed travel amount regardless of distance." },
  ],
  columns: [
    { key: "name", label: "Fuel Type", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "ratePerKM", label: "Rate (₹)", num: true, render: (r) => `₹ ${inr0(r.ratePerKM)}${r.isFixedAmount ? "" : " / km"}` },
    { key: "isFixedAmount", label: "Calculation", render: (r) => r.isFixedAmount
      ? <span className="badge bg-violet-50 text-violet-700">Fixed amount</span>
      : <span className="badge bg-sky-50 text-sky-700">KM × 2 × Rate</span> },
  ],
  importTemplate: [
    { FuelTypeName: "Petrol", RatePerKM: 12, IsFixedAmount: "No" },
    { FuelTypeName: "Local", RatePerKM: 200, IsFixedAmount: "Yes" },
  ],
  importNotes: ["IsFixedAmount: Yes/No. If the column is missing, names containing 'Local' are fixed."],
  exportRow: (r) => ({ FuelTypeName: r.name, RatePerKM: r.ratePerKM, IsFixedAmount: r.isFixedAmount ? "Yes" : "No" }),
};

export default function Page() { return <MasterPage cfg={cfg} />; }
