/** Bill list Excel in the institute's "Bill List Excel Format" (sheet "External") */
import ExcelJS from "exceljs";
import { listBills, type BillFilter } from "@/lib/bills";
import { dmy } from "@/lib/format";

const HEADERS: [string, number][] = [
  ["Sr. No", 5.44], ["Date", 10.33], ["Program-Sem\n", 12.33], ["Bill Done", 9], ["Name of the \n External Examiner", 24.44],
  ["Organization", 25.22], ["Mobile No.", 11.44], ["Distance from DU", 9], ["Amounts \nof TA", 7.89], ["Amounts \nof DA", 9],
  ["Amounts of \nHonorarium", 10.22], ["Total \nAmounts", 7.89], ["Original Bill/RC Book With true copy attached", 10.11],
  ["Name as per Bank", 32], ["Bank", 13], ["Account No.", 16.11], ["IFS Code", 17.22], ["Bank Branch", 15.33],
  ["Subject Code", 11.66], ["Subject Name", 12], ["Number of Student", 16],
];

export async function buildBillListExcel(filter: BillFilter, deptId: number) {
  const rows = await listBills(filter, deptId);
  rows.sort((a, b) => (a.billDate === b.billDate ? a.id - b.id : a.billDate < b.billDate ? -1 : 1)); // oldest first like the register

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("External");
  ws.columns = HEADERS.map(([, w]) => ({ width: w }));
  const head = ws.addRow(HEADERS.map(([h]) => h));
  head.height = 72;
  head.eachCell((c) => {
    c.font = { bold: true };
    c.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
  });

  rows.forEach((r, i) => {
    const n = i + 2;
    const row = ws.addRow([
      i + 1,
      new Date(`${r.billDate}T00:00:00Z`),
      r.programs,
      r.billDone ? "Done" : "Pending",
      r.facultyName,
      r.collegeName,
      Number(r.mobileNumber) || r.mobileNumber,
      r.isFixedTravel ? "local" : r.oneWayKm,
      r.travelAmount,
      r.daAmount,
      r.honorariumAmount,
      { formula: `SUM(I${n}:K${n})`, result: r.travelAmount + r.daAmount + r.honorariumAmount },
      r.hasRc ? "Yes" : "No",
      r.nameAsPerBank ?? "",
      r.bankName ?? "",
      r.accountNumber ? (/^\d{1,15}$/.test(r.accountNumber) ? Number(r.accountNumber) : r.accountNumber) : "",
      r.ifscCode ?? "",
      r.branchName ?? "",
      r.subjectCodes,
      r.subjectNames,
      r.students,
    ]);
    row.getCell(2).numFmt = "dd-mm-yyyy";
    row.getCell(16).numFmt = "0";
    row.getCell(7).numFmt = "0";
  });

  if (rows.length) {
    const last = rows.length + 1;
    const t = ws.addRow(["", "", "", "", "Total", "", "", "",
      { formula: `SUM(I2:I${last})` }, { formula: `SUM(J2:J${last})` }, { formula: `SUM(K2:K${last})` },
      { formula: `SUM(L2:L${last})` }, "", "", "", "", "", "", "", "", { formula: `SUM(U2:U${last})` }]);
    t.font = { bold: true };
  }
  ws.views = [{ state: "frozen", ySplit: 1 }];
  const range = filter.from || filter.to ? `${dmy(filter.from) || "start"} to ${dmy(filter.to) || "today"}` : "all dates";
  return { buffer: Buffer.from(await wb.xlsx.writeBuffer()), count: rows.length, range };
}
