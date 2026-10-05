"use client";
import { MasterPage, type MasterConfig } from "@/components/MasterPage";

const cfg: MasterConfig = {
  entity: "colleges", title: "Colleges", singular: "College",
  sub: "Colleges of external faculty with one-way distance from Darshan University",
  searchKeys: ["name", "shortName"],
  fields: [
    { key: "name", label: "College Name", required: true, full: true, placeholder: "Atmiya University" },
    { key: "shortName", label: "College Short Name", required: true, upper: true, placeholder: "AU" },
    { key: "distanceFromDU", label: "Distance From DU (KM, one way)", type: "number", required: true, placeholder: "20",
      help: "Travel allowance = distance × 2 (up + down) × fuel rate" },
  ],
  columns: [
    { key: "name", label: "College Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "shortName", label: "Short Name", render: (r) => <span className="badge bg-slate-100 text-slate-700">{r.shortName}</span> },
    { key: "distanceFromDU", label: "Distance (KM)", num: true },
    { key: "facultyCount", label: "Faculty", num: true },
  ],
  importTemplate: [
    { CollegeName: "Atmiya University", CollegeShortName: "AU", DistanceFromDU: 20 },
    { CollegeName: "Marwadi University", CollegeShortName: "MU", DistanceFromDU: 12 },
  ],
  importNotes: ["Existing colleges (same Short Name) are updated."],
  exportRow: (r) => ({ CollegeID: r.id, CollegeName: r.name, CollegeShortName: r.shortName, DistanceFromDU: r.distanceFromDU }),
};

export default function Page() { return <MasterPage cfg={cfg} />; }
