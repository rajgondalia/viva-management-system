"use client";
import Link from "next/link";
import { FileText } from "lucide-react";
import { MasterPage, type MasterConfig } from "@/components/MasterPage";
import { DocLink } from "@/components/PdfField";

const cfg: MasterConfig = {
  entity: "faculty", title: "External Faculty (Staff)", singular: "Faculty",
  sub: "Examiners who come from other colleges for viva",
  searchKeys: ["name", "mobileNumber", "collegeName", "collegeShortName", "department", "designation"],
  fields: [
    { key: "name", label: "Faculty Name", required: true, full: true, placeholder: "Dr. A. B. Patel" },
    { key: "designation", label: "Designation", placeholder: "Assistant Professor" },
    { key: "department", label: "Department", placeholder: "Computer Engineering" },
    { key: "mobileNumber", label: "Mobile Number", type: "tel", required: true, placeholder: "9876543210" },
    { key: "collegeId", label: "College", type: "select", required: true, optionsFrom: "colleges",
      placeholder: "Select college", optionLabel: (r) => r.name, optionSub: (r) => `${r.shortName} · ${r.distanceFromDU} km` },
    { key: "rcDocumentId", label: "Documents PDF - Car RC book / other documents combined (optional)", type: "file" },
  ],
  columns: [
    { key: "name", label: "Name", render: (r) => (
      <div><div className="font-medium">{r.name}</div><div className="text-xs text-slate-500">{r.designation}</div></div>) },
    { key: "department", label: "Department" },
    { key: "mobileNumber", label: "Mobile" },
    { key: "collegeShortName", label: "College", render: (r) => <span title={r.collegeName} className="badge bg-slate-100 text-slate-700">{r.collegeShortName}</span> },
    { key: "hasBank", label: "Bank", render: (r) => r.hasBank
      ? <span className="badge bg-emerald-50 text-emerald-700">Added</span>
      : <Link href="/bank-details" className="badge bg-amber-50 text-amber-700 hover:underline">Missing</Link> },
    { key: "rcDocumentId", label: "RC / Docs", render: (r) => <DocLink id={r.rcDocumentId} label="RC PDF" /> },
    { key: "billCount", label: "Bills", num: true },
  ],
  rowActions: (r) => (
    <Link href={`/bills?facultyId=${r.id}`} className="btn-ghost btn-sm" title="View bills of this faculty" aria-label="Bills">
      <FileText size={15} />
    </Link>
  ),
  importTemplate: [
    { ExternalFacultyName: "Dr. A. B. Patel", Designation: "Assistant Professor", Department: "Computer Engineering", MobileNumber: "9876543210", CollegeShortName: "AU" },
  ],
  importNotes: ["CollegeShortName (or CollegeName) must already exist in Colleges.", "Existing faculty (same Mobile Number) are updated."],
  exportRow: (r) => ({ ExternalFacultyID: r.id, ExternalFacultyName: r.name, Designation: r.designation, Department: r.department,
    MobileNumber: r.mobileNumber, CollegeShortName: r.collegeShortName, CollegeName: r.collegeName }),
};

export default function Page() { return <MasterPage cfg={cfg} />; }
