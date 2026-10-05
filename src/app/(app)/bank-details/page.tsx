"use client";
import { MasterPage, type MasterConfig } from "@/components/MasterPage";
import { DocLink } from "@/components/PdfField";

const cfg: MasterConfig = {
  entity: "bank-details", title: "Bank Details", singular: "Bank Detail",
  sub: "Bank account of each external faculty (printed on the bill for fund transfer)",
  searchKeys: ["facultyName", "nameAsPerBank", "bankName", "ifscCode", "accountNumber", "facultyMobile"],
  fields: [
    { key: "externalFacultyId", label: "External Faculty", type: "select", required: true, optionsFrom: "faculty",
      placeholder: "Select faculty", optionLabel: (r) => r.name, optionSub: (r) => `${r.collegeShortName} · ${r.mobileNumber}` },
    { key: "nameAsPerBank", label: "Name As Per Bank", required: true, full: true },
    { key: "bankName", label: "Bank Name", required: true, placeholder: "State Bank of India" },
    { key: "branchName", label: "Branch Name", placeholder: "Kalawad Road" },
    { key: "accountNumber", label: "Account Number", required: true },
    { key: "ifscCode", label: "IFSC Code", required: true, upper: true, placeholder: "SBIN0001234" },
    { key: "proofDocumentId", label: "Bank proof PDF - passbook front page / cancelled cheque (optional)", type: "file" },
  ],
  columns: [
    { key: "facultyName", label: "Faculty", render: (r) => (
      <div><div className="font-medium">{r.facultyName}</div><div className="text-xs text-slate-500">{r.facultyMobile}</div></div>) },
    { key: "nameAsPerBank", label: "Name as per Bank" },
    { key: "bankName", label: "Bank", render: (r) => <div>{r.bankName}<div className="text-xs text-slate-500">{r.branchName}</div></div> },
    { key: "accountNumber", label: "Account No." },
    { key: "ifscCode", label: "IFSC" },
    { key: "proofDocumentId", label: "Proof", render: (r) => <DocLink id={r.proofDocumentId} label="Proof" /> },
  ],
  importTemplate: [
    { FacultyMobile: "9876543210", NameAsPerBank: "PATEL ARJUN B", BankName: "State Bank of India", BranchName: "Kalawad Road", AccountNumber: "12345678901", IFSCCode: "SBIN0001234" },
  ],
  importNotes: ["FacultyMobile (or ExternalFacultyName) identifies the faculty.", "One bank account per faculty - importing again updates it."],
  exportRow: (r) => ({ FacultyMobile: r.facultyMobile, ExternalFacultyName: r.facultyName, NameAsPerBank: r.nameAsPerBank,
    BankName: r.bankName, BranchName: r.branchName, AccountNumber: r.accountNumber, IFSCCode: r.ifscCode }),
};

export default function Page() { return <MasterPage cfg={cfg} />; }
