/** Bill service: create / update / read / list with server-side (authoritative) calculation - department scoped */
import { and, asc, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { calcBill } from "@/lib/calc";
import { HttpError, bool, intId, num, str } from "@/lib/http";
import { toISODate } from "@/lib/format";
import { ensureDepartmentDefaults } from "@/lib/departments";

const { bill, billExamItem, externalFaculty, college, fuelType, setting, course, subject } = schema;

export async function getSettings(deptId: number) {
  const [row] = await db.select().from(setting).where(eq(setting.departmentId, deptId));
  if (row) return row;
  await ensureDepartmentDefaults(deptId);
  return (await db.select().from(setting).where(eq(setting.departmentId, deptId)))[0];
}

export interface ExamItemInput {
  examDate?: string; natureOfDuty?: string; courseId?: number | string | null; subjectId?: number | string | null;
  subjectCode?: string; subjectName?: string; subjectShortName?: string; courseName?: string; noOfStudents: number | string;
}
export interface BillInput {
  billDate: string; externalFacultyId: number; purpose?: string; preApproval?: boolean; billDone?: boolean;
  travelDate?: string; travelFrom?: string; travelTo?: string; fuelTypeId: number; oneWayKm?: number | string;
  daDate?: string; examItems: ExamItemInput[];
  miscDetails?: string; miscAmount?: number; miscRemarks?: string; advanceAmount?: number; remarks?: string;
}

function date(v: unknown, field: string, fallback?: string) {
  const d = toISODate(v) ?? fallback;
  if (!d) throw new HttpError(400, `${field} is required (dd/mm/yyyy).`);
  return d;
}

/** Validate input, read masters (same department only) and compute every amount */
async function buildValues(b: BillInput, deptId: number) {
  const s = await getSettings(deptId);
  const billDate = date(b.billDate, "Bill Date");
  const facultyId = intId(b.externalFacultyId, "External Faculty");
  const fuelId = intId(b.fuelTypeId, "Fuel Type");

  const [fac] = await db.select({ f: externalFaculty, c: college }).from(externalFaculty)
    .innerJoin(college, eq(college.id, externalFaculty.collegeId))
    .where(and(eq(externalFaculty.id, facultyId), eq(externalFaculty.departmentId, deptId)));
  if (!fac) throw new HttpError(400, "Selected faculty does not exist.");
  const [fuel] = await db.select().from(fuelType).where(and(eq(fuelType.id, fuelId), eq(fuelType.departmentId, deptId)));
  if (!fuel) throw new HttpError(400, "Selected fuel type does not exist.");

  // Part C rows: course + subject from masters (or free text for imports)
  const courses = await db.select().from(course).where(eq(course.departmentId, deptId));
  const subjects = await db.select().from(subject).where(eq(subject.departmentId, deptId));
  const raw = (b.examItems || []).filter((i) => i.subjectId || str(i.subjectCode) || str(i.subjectName) || Number(i.noOfStudents) > 0);
  if (!raw.length) throw new HttpError(400, "Add at least one course / subject with number of students (Part C).");

  const travelDate = date(b.travelDate, "Travel Date", billDate);
  const examRows = raw.map((i, idx) => {
    const students = Math.floor(num(i.noOfStudents, `No. of Students (row ${idx + 1})`));
    const sub = i.subjectId ? subjects.find((x) => x.id === Number(i.subjectId)) : undefined;
    if (i.subjectId && !sub) throw new HttpError(400, `Subject in row ${idx + 1} not found.`);
    if (!sub && !str(i.subjectCode) && !str(i.subjectName)) throw new HttpError(400, `Select subject in row ${idx + 1}.`);
    const crs = courses.find((c) => c.id === Number(sub ? sub.courseId : i.courseId)); // subject decides the course
    return {
      examDate: date(i.examDate, `Exam Date (row ${idx + 1})`, travelDate),
      natureOfDuty: str(i.natureOfDuty) || "Viva",
      courseId: crs?.id ?? null,
      courseName: crs?.name ?? str(i.courseName),
      courseShortName: crs?.shortName || crs?.name || str(i.courseName),
      subjectId: sub?.id ?? null,
      subjectCode: sub?.code ?? str(i.subjectCode),
      subjectName: sub?.name ?? str(i.subjectName),
      subjectShortName: sub?.shortName || sub?.name || str(i.subjectShortName) || str(i.subjectName),
      noOfStudents: students,
      baseAmount: 0, extraAmount: 0, amount: 0,
    };
  });

  const oneWayKm = b.oneWayKm === undefined || b.oneWayKm === "" ? fac.c.distanceFromDU : num(b.oneWayKm, "KM");
  const r = calcBill({
    oneWayKm, travelRate: fuel.ratePerKM, isFixedTravel: fuel.isFixedAmount, daAmount: s.daAmount,
    examItems: examRows, miscAmount: num(b.miscAmount, "Misc Amount", { required: false }),
    advanceAmount: num(b.advanceAmount, "Advance Amount", { required: false }),
  }, s);

  const header = {
    departmentId: deptId,
    billDate,
    externalFacultyId: facultyId,
    purpose: str(b.purpose) || s.defaultPurpose,
    preApproval: bool(b.preApproval),
    billDone: bool(b.billDone),
    travelDate,
    travelFrom: str(b.travelFrom) || fac.c.shortName,
    travelTo: str(b.travelTo) || s.instituteShortName,
    fuelTypeId: fuel.id,
    travelMode: fuel.isFixedAmount ? fuel.name : `Car - ${fuel.name}`,
    isFixedTravel: fuel.isFixedAmount,
    oneWayKm: r.travel.oneWayKm,
    totalKm: r.travel.totalKm,
    travelRate: fuel.ratePerKM,
    travelAmount: r.partA,
    daDate: date(b.daDate, "DA Date", travelDate),
    daNature: s.daNature,
    daRate: s.daAmount,
    daAmount: r.partB,
    totalStudents: r.totalStudents,
    honorariumBase: r.honorarium.baseAmount,
    honorariumExtra: r.honorarium.extraAmount,
    honorariumAmount: r.partC,
    miscDetails: str(b.miscDetails),
    miscAmount: r.partD,
    miscRemarks: str(b.miscRemarks),
    totalAmount: r.total,
    advanceAmount: num(b.advanceAmount, "Advance Amount", { required: false }),
    grandTotal: r.grandTotal,
    remarks: str(b.remarks),
  };
  return { header, examRows, settings: s };
}

export async function createBill(input: BillInput, deptId: number) {
  const { header, examRows, settings } = await buildValues(input, deptId);
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(bill).values(header).returning();
    const billNo = `${settings.billPrefix}/${header.billDate.slice(0, 4)}/${String(row.id).padStart(4, "0")}`;
    await tx.update(bill).set({ billNo }).where(eq(bill.id, row.id));
    await tx.insert(billExamItem).values(examRows.map((e) => ({ ...e, billId: row.id })));
    return { ...row, billNo };
  });
}

export async function updateBill(id: number, input: BillInput, deptId: number) {
  const { header, examRows } = await buildValues(input, deptId);
  return db.transaction(async (tx) => {
    const [row] = await tx.update(bill).set(header).where(and(eq(bill.id, id), eq(bill.departmentId, deptId))).returning();
    if (!row) throw new HttpError(404, "Bill not found.");
    await tx.delete(billExamItem).where(eq(billExamItem.billId, id));
    await tx.insert(billExamItem).values(examRows.map((e) => ({ ...e, billId: id })));
    return row;
  });
}

/** quick toggle of "Bill Done" from the history list */
export async function setBillDone(id: number, done: boolean, deptId: number) {
  const r = await db.update(bill).set({ billDone: done }).where(and(eq(bill.id, id), eq(bill.departmentId, deptId))).returning({ id: bill.id });
  if (!r.length) throw new HttpError(404, "Bill not found.");
}

export async function deleteBill(id: number, deptId: number) {
  const rows = await db.delete(bill).where(and(eq(bill.id, id), eq(bill.departmentId, deptId))).returning({ id: bill.id });
  if (!rows.length) throw new HttpError(404, "Bill not found.");
}

/** Full bill with faculty, college, bank and Part C rows (used by edit screen + PDF) */
export async function getBill(id: number, deptId: number) {
  const row = await db.query.bill.findFirst({
    where: and(eq(bill.id, id), eq(bill.departmentId, deptId)),
    with: {
      faculty: { with: { college: true, bankDetails: { columns: { id: true, nameAsPerBank: true, bankName: true, ifscCode: true, branchName: true, accountNumber: true, proofDocumentId: true } } } },
      examItems: { orderBy: [asc(billExamItem.id)] },
    },
  });
  if (!row) throw new HttpError(404, "Bill not found.");
  return { ...row, settings: await getSettings(deptId) };
}

export interface BillFilter { from?: string; to?: string; facultyId?: number; collegeId?: number; q?: string; done?: "yes" | "no" }

export async function listBills(f: BillFilter, deptId: number) {
  const where = [eq(bill.departmentId, deptId)];
  if (f.from) where.push(gte(bill.billDate, f.from));
  if (f.to) where.push(lte(bill.billDate, f.to));
  if (f.facultyId) where.push(eq(bill.externalFacultyId, f.facultyId));
  if (f.collegeId) where.push(eq(externalFaculty.collegeId, f.collegeId));
  if (f.done) where.push(eq(bill.billDone, f.done === "yes"));
  if (f.q) {
    const q = `%${f.q}%`;
    where.push(or(ilike(bill.billNo, q), ilike(externalFaculty.name, q), ilike(college.name, q),
      ilike(college.shortName, q), ilike(externalFaculty.mobileNumber, q),
      sql`EXISTS (SELECT 1 FROM "BillExamItem" i WHERE i."BillID" = "Bill"."BillID"
            AND (i."SubjectName" ILIKE ${q} OR i."SubjectCode" ILIKE ${q} OR i."SubjectShortName" ILIKE ${q} OR i."CourseName" ILIKE ${q}))`)!);
  }
  return db.select({
    id: bill.id, billNo: bill.billNo, billDate: bill.billDate, purpose: bill.purpose, billDone: bill.billDone,
    facultyId: externalFaculty.id, facultyName: externalFaculty.name, designation: externalFaculty.designation,
    department: externalFaculty.department, mobileNumber: externalFaculty.mobileNumber,
    collegeName: college.name, collegeShortName: college.shortName, distanceFromDU: college.distanceFromDU,
    travelMode: bill.travelMode, isFixedTravel: bill.isFixedTravel, oneWayKm: bill.oneWayKm, totalKm: bill.totalKm,
    travelRate: bill.travelRate, travelAmount: bill.travelAmount, daAmount: bill.daAmount, honorariumAmount: bill.honorariumAmount,
    miscAmount: bill.miscAmount, totalAmount: bill.totalAmount, advanceAmount: bill.advanceAmount, grandTotal: bill.grandTotal,
    hasRc: sql<boolean>`"ExternalFaculty"."RCDocumentID" IS NOT NULL`,
    programs: sql<string>`COALESCE((SELECT string_agg(DISTINCT NULLIF(COALESCE(NULLIF(i."CourseShortName",''), i."CourseName"),''), ', ')
      FROM "BillExamItem" i WHERE i."BillID" = "Bill"."BillID"), '')`,
    subjectCodes: sql<string>`COALESCE((SELECT string_agg(NULLIF(i."SubjectCode",''), ', ' ORDER BY i."BillExamItemID")
      FROM "BillExamItem" i WHERE i."BillID" = "Bill"."BillID"), '')`,
    subjectNames: sql<string>`COALESCE((SELECT string_agg(NULLIF(COALESCE(NULLIF(i."SubjectShortName",''), i."SubjectName"),''), ', ' ORDER BY i."BillExamItemID")
      FROM "BillExamItem" i WHERE i."BillID" = "Bill"."BillID"), '')`,
    students: bill.totalStudents,
    bankName: sql<string>`(SELECT bd."BankName" FROM "BankDetails" bd WHERE bd."ExternalFacultyID" = "ExternalFaculty"."ExternalFacultyID")`,
    nameAsPerBank: sql<string>`(SELECT bd."NameAsPerBank" FROM "BankDetails" bd WHERE bd."ExternalFacultyID" = "ExternalFaculty"."ExternalFacultyID")`,
    accountNumber: sql<string>`(SELECT bd."AccountNumber" FROM "BankDetails" bd WHERE bd."ExternalFacultyID" = "ExternalFaculty"."ExternalFacultyID")`,
    ifscCode: sql<string>`(SELECT bd."IFSCCode" FROM "BankDetails" bd WHERE bd."ExternalFacultyID" = "ExternalFaculty"."ExternalFacultyID")`,
    branchName: sql<string>`(SELECT bd."BranchName" FROM "BankDetails" bd WHERE bd."ExternalFacultyID" = "ExternalFaculty"."ExternalFacultyID")`,
  }).from(bill)
    .innerJoin(externalFaculty, eq(externalFaculty.id, bill.externalFacultyId))
    .innerJoin(college, eq(college.id, externalFaculty.collegeId))
    .where(and(...where))
    .orderBy(desc(bill.billDate), desc(bill.id));
}

/** Excel import of bills: one row = one bill (one course/subject) */
export async function importBills(rows: Record<string, unknown>[], deptId: number) {
  const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");
  const result = { inserted: 0, updated: 0, errors: [] as { row: number; message: string }[] };
  const faculties = await db.select().from(externalFaculty).where(eq(externalFaculty.departmentId, deptId));
  const fuels = await db.select().from(fuelType).where(eq(fuelType.departmentId, deptId));
  const courses = await db.select().from(course).where(eq(course.departmentId, deptId));
  const subjects = await db.select().from(subject).where(eq(subject.departmentId, deptId));
  for (let i = 0; i < rows.length; i++) {
    const m: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rows[i])) m[norm(k)] = v;
    const get = (...a: string[]) => { for (const k of a) if (m[k] !== undefined && m[k] !== "") return m[k]; };
    try {
      if (Object.values(m).every((v) => str(v) === "")) continue;
      const mobile = str(get("facultymobile", "mobilenumber", "mobile", "mobileno")).replace(/\D/g, "").slice(-10);
      const fname = str(get("externalfacultyname", "facultyname", "faculty", "nameoftheexternalexaminer")).toLowerCase();
      let fac = mobile ? faculties.find((f) => f.mobileNumber === mobile) : undefined;
      if (!fac && fname) {
        const hits = faculties.filter((f) => f.name.toLowerCase() === fname);
        if (hits.length > 1) throw new HttpError(400, `More than one faculty named "${fname}" - use Faculty Mobile.`);
        fac = hits[0];
      }
      if (!fac) throw new HttpError(400, "Faculty not found (Faculty Mobile / Faculty Name).");
      const fuelName = str(get("fueltype", "fuletype", "fueltypename", "travelmode")).toLowerCase();
      const fuel = fuels.find((f) => f.name.toLowerCase() === fuelName);
      if (!fuel) throw new HttpError(400, `Fuel type "${fuelName}" not found.`);
      const billDate = toISODate(get("billdate", "date"));
      if (!billDate) throw new HttpError(400, "Bill Date is required.");
      const cRef = str(get("coursename", "course", "programsem", "program")).toLowerCase();
      const crs = cRef ? courses.find((c) => c.name.toLowerCase() === cRef || c.shortName.toLowerCase() === cRef) : undefined;
      if (cRef && !crs) throw new HttpError(400, `Course "${cRef}" not found.`);
      const code = str(get("subjectcode", "code")).toUpperCase();
      const sub = code ? subjects.find((s) => s.code === code && (!crs || s.courseId === crs.id)) : undefined;
      await createBill({
        billDate, externalFacultyId: fac.id, fuelTypeId: fuel.id,
        oneWayKm: get("onewaykm", "distance", "km") as string | undefined,
        travelDate: toISODate(get("traveldate")) ?? billDate,
        purpose: str(get("purpose")),
        billDone: /^(done|yes|true|1)$/i.test(str(get("billdone", "done"))),
        examItems: [{
          examDate: toISODate(get("examdate", "vivadate")) ?? billDate,
          natureOfDuty: str(get("natureofduty")) || "Viva",
          courseId: crs?.id ?? sub?.courseId ?? null, subjectId: sub?.id ?? null,
          subjectCode: code, subjectName: str(get("subjectname", "subject")),
          noOfStudents: Number(get("noofstudents", "students", "studentcount", "numberofstudent", "numberofstudents") ?? 0),
        }],
        advanceAmount: Number(get("advanceamount", "advance") ?? 0),
        remarks: str(get("remarks")),
      }, deptId);
      result.inserted++;
    } catch (e) {
      result.errors.push({ row: i + 2, message: (e as Error).message });
    }
  }
  return result;
}

export async function dashboardStats(deptId: number) {
  const one = async <T,>(q: ReturnType<typeof sql>) => ((await db.execute(q)).rows[0] as T);
  const totals = await one<Record<string, number>>(sql`
    SELECT COUNT(*)::int AS bills, COALESCE(SUM("GrandTotal"),0)::float AS amount,
      COALESCE(SUM("TravelAmount"),0)::float AS "partA", COALESCE(SUM("DAAmount"),0)::float AS "partB",
      COALESCE(SUM("HonorariumAmount"),0)::float AS "partC",
      COUNT(*) FILTER (WHERE NOT "BillDone")::int AS "pending",
      COUNT(*) FILTER (WHERE date_trunc('month',"BillDate") = date_trunc('month', CURRENT_DATE))::int AS "monthBills",
      COALESCE(SUM("GrandTotal") FILTER (WHERE date_trunc('month',"BillDate") = date_trunc('month', CURRENT_DATE)),0)::float AS "monthAmount"
    FROM "Bill" WHERE "DepartmentID" = ${deptId}`);
  const counts = await one<Record<string, number>>(sql`
    SELECT (SELECT COUNT(*)::int FROM "College" WHERE "DepartmentID" = ${deptId}) AS colleges,
           (SELECT COUNT(*)::int FROM "ExternalFaculty" WHERE "DepartmentID" = ${deptId}) AS faculty,
           (SELECT COUNT(*)::int FROM "ExternalFaculty" f WHERE f."DepartmentID" = ${deptId} AND NOT EXISTS
              (SELECT 1 FROM "BankDetails" b WHERE b."ExternalFacultyID" = f."ExternalFacultyID")) AS "facultyWithoutBank"`);
  const monthly = (await db.execute(sql`
    SELECT to_char(m, 'Mon YY') AS label, COALESCE(SUM(b."GrandTotal"),0)::float AS amount, COUNT(b."BillID")::int AS bills
    FROM generate_series(date_trunc('month', CURRENT_DATE) - interval '5 months', date_trunc('month', CURRENT_DATE), interval '1 month') m
    LEFT JOIN "Bill" b ON date_trunc('month', b."BillDate") = m AND b."DepartmentID" = ${deptId}
    GROUP BY m ORDER BY m`)).rows;
  const topColleges = (await db.execute(sql`
    SELECT c."CollegeShortName" AS name, COUNT(b."BillID")::int AS bills, COALESCE(SUM(b."GrandTotal"),0)::float AS amount
    FROM "Bill" b JOIN "ExternalFaculty" f ON f."ExternalFacultyID" = b."ExternalFacultyID"
    JOIN "College" c ON c."CollegeID" = f."CollegeID"
    WHERE b."DepartmentID" = ${deptId}
    GROUP BY c."CollegeShortName" ORDER BY amount DESC LIMIT 5`)).rows;
  const recent = (await listBills({}, deptId)).slice(0, 6);
  return { ...totals, ...counts, monthly, topColleges, recent };
}
