"use client";
/**
 * PDF generator - reproduces "Bill for Reimbursement of Allowances/Honorarium" (2 pages, A4)
 * with Part A/B/C/D, summary, certification, bank details, approvals and receiver section.
 */
import { jsPDF } from "jspdf";
import autoTable, { type RowInput, type UserOptions } from "jspdf-autotable";
import { amountInWords, dmy, inr } from "@/lib/format";
import { api } from "@/lib/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
type FullBill = any;

let logoCache: string | null = null;
async function logo(): Promise<string | null> {
  if (logoCache) return logoCache;
  try {
    const blob = await (await fetch("/logo-white.png")).blob();
    logoCache = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(blob); });
    return logoCache;
  } catch { return null; }
}

const M = 15;          // page margin (mm)
const W = 210 - 2 * M; // content width
const money = (n: number) => inr(n);

export async function buildBillPdf(b: FullBill) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const s = b.settings;
  const fac = b.faculty;
  const img = await logo();
  // Travel plan columns use SHORT names (old bills saved full names -> convert them too).
  // Only the "Institute" field at the top prints the full college name.
  const short = (name: string) => {
    const n = (name || "").trim().toLowerCase();
    if (fac.college && n === String(fac.college.name).toLowerCase()) return fac.college.shortName;
    if (n === String(s.instituteName).toLowerCase()) return s.instituteShortName;
    return name;
  };
  const from = short(b.travelFrom), to = short(b.travelTo);
  const tableBase: Partial<UserOptions> = {
    theme: "grid", margin: { left: M + 4, right: M, top: 12, bottom: 12 },
    styles: { font: "helvetica", fontSize: 8.2, cellPadding: { top: 1.05, bottom: 1.05, left: 1.5, right: 1.5 }, lineColor: [60, 60, 60], lineWidth: 0.2, textColor: [20, 20, 20] },
    headStyles: { fillColor: [217, 217, 217], textColor: [0, 0, 0], fontStyle: "bold", halign: "center", valign: "middle" },
  };
  const lastY = () => (doc as any).lastAutoTable.finalY as number;
  // the official format always shows at least 3 rows per part - empty rows stay blank
  const pad = (rows: RowInput[], cols: number, min = 3): RowInput[] =>
    rows.length >= min ? rows : [...rows, ...Array.from({ length: min - rows.length }, () => Array(cols).fill(" "))];

  /* ---------------- PAGE 1 ---------------- */
  if (img) doc.addImage(img, "PNG", M, 10, 42, 15.5);
  doc.setFont("helvetica", "normal").setFontSize(9.5);
  doc.text(`Date: ${dmy(b.billDate)}`, 210 - M, 24, { align: "right" });
  doc.setFontSize(8).setTextColor(90);
  doc.text(`Bill No: ${b.billNo ?? ""}`, 210 - M, 19, { align: "right" });
  doc.setTextColor(0);

  doc.setFont("helvetica", "bold").setFontSize(11.5);
  const title = "Bill for Reimbursement of Allowances/Honorarium";
  doc.text(title, 105, 32, { align: "center" });
  const tw = doc.getTextWidth(title);
  doc.setLineWidth(0.3).line(105 - tw / 2, 33, 105 + tw / 2, 33);

  // Personal details
  let y = 40;
  const field = (label: string, value: string, x = M + 4, valueW = W - 32, labelW = 26) => {
    doc.setFont("helvetica", "normal").setFontSize(9.5).text(label, x, y);
    doc.text(":", x + labelW, y);
    doc.setFont("helvetica", "bold").text(value || "", x + labelW + 4, y - 0.6, { maxWidth: valueW });
    doc.setLineWidth(0.15).setDrawColor(120).line(x + labelW + 3, y + 0.8, x + labelW + 3 + valueW, y + 0.8);
    doc.setDrawColor(0);
  };
  field("Name", fac.name); y += 6.2;
  field("Designation", fac.designation, M + 4, 70);
  doc.setFont("helvetica", "normal").text("Mobile No.", 128, y);
  doc.setFont("helvetica", "bold").text(fac.mobileNumber, 147, y - 0.6);
  doc.setLineWidth(0.15).setDrawColor(120).line(146, y + 0.8, 210 - M, y + 0.8); doc.setDrawColor(0);
  y += 6.2; field("Department", fac.department);
  y += 6.2; field("Institute", fac.college?.name ?? "");
  y += 6.2; field("Purpose", b.purpose);
  y += 6.2;
  doc.setFont("helvetica", "normal").text("Pre-approval", M + 4, y); doc.text(":", M + 30, y);
  doc.setFont("helvetica", "bold").text(b.preApproval ? "Yes" : "No", M + 34, y);
  doc.setFont("helvetica", "bolditalic").setFontSize(7.5).text("(If Yes, Attach the Documents)", M + 42, y);

  const section = (letter: string, text: string, sub?: string) => {
    y = (y > 0 ? y : lastY()) + 5.5;
    doc.setFont("helvetica", "bold").setFontSize(9.5).text(`${letter}.`, M, y);
    doc.text(text, M + 6, y);
    if (sub) { const w = doc.getTextWidth(text); doc.setFont("helvetica", "normal").setFontSize(7.5).text(sub, M + 7 + w, y); }
    y += 1.5;
  };

  // ---- A. Travel Allowance
  section("A", "Travel Allowance");
  const travelRows: RowInput[] = b.isFixedTravel
    ? [[dmy(b.travelDate), from, to, `${b.travelMode} (Up & Down)`, "-", "Fixed", money(b.travelAmount)]]
    : [
        [dmy(b.travelDate), from, to, b.travelMode, String(b.oneWayKm), money(b.travelRate), money(b.travelAmount / 2)],
        [dmy(b.travelDate), to, from, b.travelMode, String(b.oneWayKm), money(b.travelRate), money(b.travelAmount / 2)],
      ];
  autoTable(doc, {
    ...tableBase, startY: y,
    head: [
      [{ content: "Date", rowSpan: 2 }, { content: "Travel Plan", colSpan: 2 },
       { content: "Travel Mode\n(Bus, Car, Taxi etc...)", rowSpan: 2 }, { content: "Total KM", rowSpan: 2 },
       { content: "Rate", rowSpan: 2 }, { content: "Total Amount", rowSpan: 2 }],
      ["From", "To"],
    ],
    body: [...pad(travelRows, 7),
      [{ content: "Total", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
       { content: b.isFixedTravel ? "-" : String(b.totalKm), styles: { halign: "center", fontStyle: "bold" } },
       { content: "---", styles: { halign: "center" } },
       { content: money(b.travelAmount), styles: { halign: "right", fontStyle: "bold" } }]],
    columnStyles: { 0: { cellWidth: 20, halign: "center" }, 1: { cellWidth: 32 }, 2: { cellWidth: 32 }, 3: { cellWidth: 28 },
      4: { cellWidth: 17, halign: "center" }, 5: { cellWidth: 15, halign: "center" }, 6: { halign: "right" } },
  });
  y = 0;

  // ---- B. Dearness Allowance
  y = lastY(); section("B", "Dearness Allowance");
  autoTable(doc, {
    ...tableBase, startY: y,
    head: [
      [{ content: "Date", rowSpan: 2 }, { content: "Travel Plan", colSpan: 2 },
       { content: "Nature of Expense\n(Lodging, Boarding etc...)", rowSpan: 2 }, { content: "Rate", rowSpan: 2 },
       { content: "Total Amount", rowSpan: 2 }],
      ["From", "To"],
    ],
    body: [
      ...pad([[dmy(b.daDate), from, to, b.daNature, money(b.daRate), money(b.daAmount)]], 6),
      [{ content: "Total", colSpan: 3, styles: { halign: "right", fontStyle: "bold" } }, "",
       { content: "---", styles: { halign: "center" } }, { content: money(b.daAmount), styles: { halign: "right", fontStyle: "bold" } }],
    ],
    columnStyles: { 0: { cellWidth: 20, halign: "center" }, 1: { cellWidth: 32 }, 2: { cellWidth: 32 }, 3: { cellWidth: 40, halign: "center" },
      4: { cellWidth: 20, halign: "center" }, 5: { halign: "right" } },
  });

  // ---- C. Examination Honorarium
  y = lastY(); section("C", "Examination Honorarium");
  // Honorarium is calculated on TOTAL students of all rows (old bills had per-row amounts)
  const legacy = b.examItems.some((i: any) => i.amount > 0);
  const per = s.honorariumExtraPerStudent || 15;
  const examRows: RowInput[] = b.examItems.map((i: any) => {
    const course = i.courseShortName || i.courseName;
    const duty = `${i.natureOfDuty}${course ? ` - ${course}` : ""} (${i.noOfStudents} stu.)`;
    const subj = i.subjectShortName || i.subjectName;
    if (!legacy) return [dmy(i.examDate), duty, i.subjectCode, subj, "", ""];
    const rate = i.extraAmount > 0 ? `${money(i.baseAmount)} + ${Math.round(i.extraAmount / per)}x${per}` : money(i.baseAmount);
    return [dmy(i.examDate), duty, i.subjectCode, subj, rate, money(i.amount)];
  });
  const extraStu = Math.round((b.honorariumExtra || 0) / per);
  const totalRate = legacy ? "---" : b.honorariumExtra > 0 ? `${money(b.honorariumBase)} + ${extraStu}x${per}` : money(b.honorariumBase);
  autoTable(doc, {
    ...tableBase, startY: y,
    head: [["Date", "Nature of Duty\n(Paper Checking, Viva etc...)", "Subject Code", "Subject Name", "Rate", "Total Amount"]],
    body: [...pad(examRows, 6),
      [{ content: `Total (${b.totalStudents || b.examItems.reduce((a: number, i: any) => a + i.noOfStudents, 0)} students)`, colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
       { content: totalRate, styles: { halign: "center" } }, { content: money(b.honorariumAmount), styles: { halign: "right", fontStyle: "bold" } }]],
    columnStyles: { 0: { cellWidth: 20, halign: "center" }, 1: { cellWidth: 38 }, 2: { cellWidth: 24, halign: "center" }, 3: { cellWidth: 44 },
      4: { cellWidth: 22, halign: "center" }, 5: { halign: "right" } },
  });

  // ---- D. Miscellaneous
  y = lastY(); section("D", "Miscellaneous", "(Expert Honorarium, other bills etc...)");
  autoTable(doc, {
    ...tableBase, startY: y,
    head: [["Date", "Details", "Amount", "Remarks"]],
    body: [
      b.miscAmount > 0 ? [dmy(b.billDate), b.miscDetails, money(b.miscAmount), b.miscRemarks] : [" ", "", "", ""],
      [{ content: "Total", colSpan: 2, styles: { halign: "right", fontStyle: "bold" } },
       { content: money(b.miscAmount), styles: { halign: "right", fontStyle: "bold" } }, ""],
    ],
    columnStyles: { 0: { cellWidth: 20, halign: "center" }, 1: { cellWidth: 72 }, 2: { cellWidth: 35, halign: "right" } },
  });

  // ---- Summary
  y = lastY() + 7;
  doc.setFont("helvetica", "bold").setFontSize(9.5).text("Summary", M + 6, y); // same x as "Travel Allowance" etc.
  autoTable(doc, {
    ...tableBase, startY: y + 1.5, margin: { left: M + 4, right: 210 - M - 4 - 115 }, tableWidth: 115, // same left edge as A-D tables
    head: [["Details", "Amount", "Remarks"]],
    headStyles: { ...tableBase.headStyles, halign: "left" },
    body: [
      ["Total of section A+B+C+D", money(b.totalAmount), ""],
      ["Advance Amount received", money(b.advanceAmount), ""],
      [{ content: "Grand Total", styles: { halign: "right", fontStyle: "bold" } },
       { content: money(b.grandTotal), styles: { fontStyle: "bold" } }, ""],
    ],
    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 30, halign: "right" } },
  });
  doc.setFont("helvetica", "italic").setFontSize(8.5)
    .text(`(Rupees ${amountInWords(b.grandTotal)} only)`, M + 4, lastY() + 5, { maxWidth: W - 4 });

  /* ---------------- PAGE 2 ---------------- */
  doc.addPage();
  if (img) doc.addImage(img, "PNG", M, 10, 42, 15.5);
  y = 34;
  doc.setFont("helvetica", "normal").setFontSize(9.5).text("This is to certify that,", M, y);
  const bullets = [
    "I have travelled as a pre-requisite to participate in the examination, event, seminar, etc. and fare claimed hereby is actual and admissible as per the rule",
    `I confirm that this amount is not claimed elsewhere and if it is found at any stage that the above claim/part of the claim paid/received to me is due to either side by mistake; I undertake to refund the same to the University.`,
    "I hereby certify that the above details are correct that I am a resident of India and that the provision of the Income tax-act 1961 is applicable to me and shall comply with it.",
  ];
  y += 5;
  for (const t of bullets) {
    const lines = doc.splitTextToSize(t, W - 10);
    doc.text("\u2022", M + 3, y);
    // justified like the original form (last line of each point stays left-aligned)
    doc.text(t, M + 8, y, { maxWidth: W - 10, align: "justify", lineHeightFactor: 1.31 });
    y += lines.length * 4.4 + 1.2;
  }

  y += 4;
  doc.setFont("helvetica", "bold").setFontSize(9.5).text("Bank information of receiver for Electronic fund transfer*", M + 8, y);
  const bank = fac.bankDetails;
  autoTable(doc, {
    ...tableBase, startY: y + 2, margin: { left: M + 8, right: M + 30 },
    body: [
      ["Account Name", bank?.nameAsPerBank ?? ""], ["Bank Name", bank?.bankName ?? ""], ["Branch", bank?.branchName ?? ""],
      ["Account No.", bank?.accountNumber ?? ""], ["IFSC Code", bank?.ifscCode ?? ""],
    ],
    columnStyles: { 0: { cellWidth: 40, fontStyle: "bold" }, 1: { fontStyle: "bold" } },
    styles: { ...tableBase.styles, fontSize: 9.5, cellPadding: 2 },
  });

  y = lastY() + 7;
  // Note block: bold-italic, small, with bullets - as in the original form
  doc.setFont("helvetica", "bolditalic").setFontSize(8.5).text("Note:", M, y);
  doc.setFontSize(8);
  ["Kindly attach relevant documents (i.e. Proof for Food / Travel etc...)",
   "A copy of Cancelled Cheque/ Passbook Front Page required"].forEach((t, i) => {
    doc.setFont("helvetica", "normal").text("\u2022", M + 3, y + 4.5 + i * 4.5);
    doc.setFont("helvetica", "bolditalic").text(t, M + 7, y + 4.5 + i * 4.5);
  });

  y += 19;
  doc.setFont("helvetica", "normal").setFontSize(9.5).text("The above information provided by me is correct.", M, y);
  doc.text(`Date : ${dmy(b.billDate)}`, M + 3, y + 6);
  doc.text(`Place : ${s.place}`, M + 3, y + 12);
  doc.setFont("helvetica", "bold").text("Signature", 210 - M, y + 12, { align: "right" });

  y += 22;
  doc.setFont("helvetica", "bold").text("Verify & Approved By:", M, y);
  y += 20;
  const sig = ["Dean/H.O.D.", "Registrar/CoE*", "Account Officer", "Vice-Chancellor"];
  sig.forEach((t, i) => {
    const cx = M + 20 + i * ((W - 40) / 3);
    doc.setLineWidth(0.2).line(cx - 14, y, cx + 14, y);
    doc.setFont("helvetica", "bold").setFontSize(9).text(t, cx, y + 4.5, { align: "center" });
  });
  doc.setFont("helvetica", "italic").setFontSize(7.5).text("*for the Examination related expenses, CoE will be the responsible person", M, y + 10);

  // dashed separator
  y += 18;
  doc.setLineDashPattern([1.2, 1], 0).setLineWidth(0.2).line(M - 5, y, 210 - M + 5, y).setLineDashPattern([], 0);

  y += 7;
  doc.setFont("helvetica", "bold").setFontSize(9.5).text("Receiver's Signature", M + 40, y, { align: "center" });
  doc.text("Account Use only", 210 - M - 30, y, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(9);
  const recv = `Received Rs. ${money(b.grandTotal)} (Rupees in words ${amountInWords(b.grandTotal)} only) through Online/Cheque/Cash on ____________ From ${s.instituteName} ${s.place} towards TA and DA/Honorarium etc...`;
  doc.text(doc.splitTextToSize(recv, 105), M, y + 7, { lineHeightFactor: 1.5 });
  const acc = [["Amount Paid", money(b.grandTotal)], ["Mode", "Cash/Cheque/Online"], ["Reference No.", "__________________"], ["Date", "__________________"]];
  acc.forEach(([k, v], i) => {
    doc.text(k, 130, y + 7 + i * 6); doc.text(`: ${v}`, 155, y + 7 + i * 6);
  });
  doc.text("Date:", M, y + 40); doc.text("Signature", M + 95, y + 40, { align: "right" });
  doc.setFont("helvetica", "bold").text("Account Department", 210 - M, y + 40, { align: "right" });

  // page numbers
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(90).text(`Page ${p} of ${pages}`, 210 - M, 290, { align: "right" });
    doc.setTextColor(0);
  }
  return doc;
}

export function billFileName(b: FullBill) {
  return `Bill_${(b.billNo ?? b.id).toString().replace(/[\\/]/g, "-")}_${b.faculty.name.replace(/[^a-z0-9]+/gi, "_")}.pdf`;
}

/** Fetch bill by id and download its PDF */
export async function downloadBillPdf(id: number) {
  const b = await api<FullBill>(`/api/bills/${id}`);
  const doc = await buildBillPdf(b);
  doc.save(billFileName(b));
}
