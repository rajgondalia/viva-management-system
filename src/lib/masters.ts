/**
 * Master tables (College, ExternalFaculty, BankDetails, FuelType, Course, Subject):
 * list / create / update / delete + Excel import. Every query is scoped to the user's department.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { HttpError, bool, intId, num, reqStr, str } from "@/lib/http";
import { checkDocId, deleteDocuments } from "@/lib/documents";

const { college, externalFaculty, bankDetails, fuelType, course, subject } = schema;

export type Entity = "colleges" | "faculty" | "bank-details" | "fuel-types" | "courses" | "subjects";
export const ENTITIES: Entity[] = ["colleges", "faculty", "bank-details", "fuel-types", "courses", "subjects"];

type Row = Record<string, unknown>;

/* ------------------------------ ownership checks ------------------------------ */
async function own(table: typeof college | typeof externalFaculty | typeof course, id: number, dept: number, label: string) {
  const [r] = await db.select({ id: table.id }).from(table).where(and(eq(table.id, id), eq(table.departmentId, dept)));
  if (!r) throw new HttpError(400, `${label} not found.`);
  return id;
}

/* ------------------------------ parsers ------------------------------ */
function parseCollege(b: Row, dept: number) {
  return {
    departmentId: dept,
    name: reqStr(b.name, "College Name"),
    shortName: reqStr(b.shortName, "College Short Name").toUpperCase(),
    distanceFromDU: num(b.distanceFromDU, "Distance From DU"),
  };
}
async function parseFaculty(b: Row, dept: number) {
  const mobile = reqStr(b.mobileNumber, "Mobile Number").replace(/[\s-]/g, "").replace(/^\+?91(?=\d{10}$)/, "");
  if (!/^\d{10}$/.test(mobile)) throw new HttpError(400, "Mobile Number must be 10 digits.");
  return {
    departmentId: dept,
    name: reqStr(b.name, "Faculty Name"),
    designation: str(b.designation),
    department: str(b.department),
    mobileNumber: mobile,
    collegeId: await own(college, intId(b.collegeId, "College"), dept, "College"),
    ...(b.rcDocumentId !== undefined ? { rcDocumentId: await checkDocId(dept, b.rcDocumentId) } : {}),
  };
}
async function parseBank(b: Row, dept: number) {
  const ifsc = reqStr(b.ifscCode, "IFSC Code").toUpperCase().replace(/\s/g, "");
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) throw new HttpError(400, `IFSC Code "${ifsc}" is not valid (e.g. SBIN0001234).`);
  return {
    departmentId: dept,
    nameAsPerBank: reqStr(b.nameAsPerBank, "Name As Per Bank"),
    bankName: reqStr(b.bankName, "Bank Name"),
    ifscCode: ifsc,
    branchName: str(b.branchName),
    accountNumber: reqStr(b.accountNumber, "Account Number").replace(/\s/g, ""),
    externalFacultyId: await own(externalFaculty, intId(b.externalFacultyId, "External Faculty"), dept, "Faculty"),
    ...(b.proofDocumentId !== undefined ? { proofDocumentId: await checkDocId(dept, b.proofDocumentId) } : {}),
  };
}
function parseFuel(b: Row, dept: number) {
  return { departmentId: dept, name: reqStr(b.name, "Fuel Type Name"), ratePerKM: num(b.ratePerKM, "Rate"), isFixedAmount: bool(b.isFixedAmount) };
}
function parseCourse(b: Row, dept: number) {
  return { departmentId: dept, name: reqStr(b.name, "Course Name"), shortName: str(b.shortName) };
}
async function parseSubject(b: Row, dept: number) {
  const name = reqStr(b.name, "Subject Name");
  return {
    departmentId: dept,
    courseId: await own(course, intId(b.courseId, "Course"), dept, "Course"),
    code: reqStr(b.code, "Subject Code").toUpperCase(),
    name,
    shortName: str(b.shortName) || name,
  };
}

/* ------------------------------ list ------------------------------ */
export async function listEntity(entity: Entity, dept: number) {
  switch (entity) {
    case "colleges":
      return db.select({
        id: college.id, name: college.name, shortName: college.shortName, distanceFromDU: college.distanceFromDU,
        facultyCount: sql<number>`(SELECT COUNT(*)::int FROM "ExternalFaculty" f WHERE f."CollegeID" = "College"."CollegeID")`,
      }).from(college).where(eq(college.departmentId, dept)).orderBy(asc(college.name));
    case "faculty":
      return db.select({
        id: externalFaculty.id, name: externalFaculty.name, designation: externalFaculty.designation,
        department: externalFaculty.department, mobileNumber: externalFaculty.mobileNumber,
        collegeId: externalFaculty.collegeId, collegeName: college.name, collegeShortName: college.shortName,
        distanceFromDU: college.distanceFromDU, rcDocumentId: externalFaculty.rcDocumentId,
        hasBank: sql<boolean>`EXISTS (SELECT 1 FROM "BankDetails" b WHERE b."ExternalFacultyID" = "ExternalFaculty"."ExternalFacultyID")`,
        billCount: sql<number>`(SELECT COUNT(*)::int FROM "Bill" b WHERE b."ExternalFacultyID" = "ExternalFaculty"."ExternalFacultyID")`,
      }).from(externalFaculty).innerJoin(college, eq(college.id, externalFaculty.collegeId))
        .where(eq(externalFaculty.departmentId, dept)).orderBy(asc(externalFaculty.name));
    case "bank-details":
      return db.select({
        id: bankDetails.id, nameAsPerBank: bankDetails.nameAsPerBank, bankName: bankDetails.bankName,
        ifscCode: bankDetails.ifscCode, branchName: bankDetails.branchName, accountNumber: bankDetails.accountNumber,
        externalFacultyId: bankDetails.externalFacultyId, facultyName: externalFaculty.name,
        facultyMobile: externalFaculty.mobileNumber, proofDocumentId: bankDetails.proofDocumentId,
      }).from(bankDetails).innerJoin(externalFaculty, eq(externalFaculty.id, bankDetails.externalFacultyId))
        .where(eq(bankDetails.departmentId, dept)).orderBy(asc(externalFaculty.name));
    case "fuel-types":
      return db.select({ id: fuelType.id, name: fuelType.name, ratePerKM: fuelType.ratePerKM, isFixedAmount: fuelType.isFixedAmount })
        .from(fuelType).where(eq(fuelType.departmentId, dept)).orderBy(asc(fuelType.name));
    case "courses":
      return db.select({
        id: course.id, name: course.name, shortName: course.shortName,
        subjectCount: sql<number>`(SELECT COUNT(*)::int FROM "Subject" s WHERE s."CourseID" = "Course"."CourseID")`,
      }).from(course).where(eq(course.departmentId, dept)).orderBy(asc(course.name));
    case "subjects":
      return db.select({
        id: subject.id, code: subject.code, name: subject.name, shortName: subject.shortName,
        courseId: subject.courseId, courseName: course.name, courseShortName: course.shortName,
      }).from(subject).innerJoin(course, eq(course.id, subject.courseId))
        .where(eq(subject.departmentId, dept)).orderBy(asc(course.name), asc(subject.code));
  }
}

/* ------------------------------ create / update / delete ------------------------------ */
export async function createEntity(entity: Entity, body: Row, dept: number) {
  switch (entity) {
    case "colleges": return (await db.insert(college).values(parseCollege(body, dept)).returning())[0];
    case "faculty": return (await db.insert(externalFaculty).values(await parseFaculty(body, dept)).returning())[0];
    case "bank-details": return (await db.insert(bankDetails).values(await parseBank(body, dept)).returning())[0];
    case "fuel-types": return (await db.insert(fuelType).values(parseFuel(body, dept)).returning())[0];
    case "courses": return (await db.insert(course).values(parseCourse(body, dept)).returning())[0];
    case "subjects": return (await db.insert(subject).values(await parseSubject(body, dept)).returning())[0];
  }
}

const TABLES = { colleges: college, faculty: externalFaculty, "bank-details": bankDetails, "fuel-types": fuelType, courses: course, subjects: subject };

export async function updateEntity(entity: Entity, id: number, body: Row, dept: number) {
  const where = (t: (typeof TABLES)[Entity]) => and(eq(t.id, id), eq(t.departmentId, dept));
  let rows: unknown[] = [];
  switch (entity) {
    case "colleges": rows = await db.update(college).set(parseCollege(body, dept)).where(where(college)).returning(); break;
    case "faculty": {
      const [old] = await db.select({ doc: externalFaculty.rcDocumentId }).from(externalFaculty).where(where(externalFaculty));
      const v = await parseFaculty(body, dept);
      rows = await db.update(externalFaculty).set(v).where(where(externalFaculty)).returning();
      if (old?.doc && "rcDocumentId" in v && v.rcDocumentId !== old.doc) await deleteDocuments([old.doc]);
      break;
    }
    case "bank-details": {
      const [old] = await db.select({ doc: bankDetails.proofDocumentId }).from(bankDetails).where(where(bankDetails));
      const v = await parseBank(body, dept);
      rows = await db.update(bankDetails).set(v).where(where(bankDetails)).returning();
      if (old?.doc && "proofDocumentId" in v && v.proofDocumentId !== old.doc) await deleteDocuments([old.doc]);
      break;
    }
    case "fuel-types": rows = await db.update(fuelType).set(parseFuel(body, dept)).where(where(fuelType)).returning(); break;
    case "courses": rows = await db.update(course).set(parseCourse(body, dept)).where(where(course)).returning(); break;
    case "subjects": rows = await db.update(subject).set(await parseSubject(body, dept)).where(where(subject)).returning(); break;
  }
  if (!rows.length) throw new HttpError(404, "Record not found.");
  return rows[0];
}

export async function deleteEntity(entity: Entity, id: number, dept: number) {
  const t = TABLES[entity];
  let docs: (number | null)[] = [];
  if (entity === "faculty") {
    const [f] = await db.select({ d: externalFaculty.rcDocumentId }).from(externalFaculty).where(eq(externalFaculty.id, id));
    const [b] = await db.select({ d: bankDetails.proofDocumentId }).from(bankDetails).where(eq(bankDetails.externalFacultyId, id));
    docs = [f?.d ?? null, b?.d ?? null];
  }
  if (entity === "bank-details") {
    const [b] = await db.select({ d: bankDetails.proofDocumentId }).from(bankDetails).where(eq(bankDetails.id, id));
    docs = [b?.d ?? null];
  }
  const rows = await db.delete(t).where(and(eq(t.id, id), eq(t.departmentId, dept))).returning({ id: t.id });
  if (!rows.length) throw new HttpError(404, "Record not found.");
  await deleteDocuments(docs);
}

/* ------------------------------ Excel import ------------------------------ */
const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");
function pick(row: Row, ...aliases: string[]) {
  const m: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) m[norm(k)] = v;
  for (const a of aliases) if (m[a] !== undefined && m[a] !== "") return m[a];
  return undefined;
}

export interface ImportResult { inserted: number; updated: number; errors: { row: number; message: string }[] }

export async function importEntity(entity: Entity, rows: Row[], dept: number): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, updated: 0, errors: [] };

  const colleges = await db.select().from(college).where(eq(college.departmentId, dept));
  const byShort = new Map(colleges.map((c) => [c.shortName.toLowerCase(), c.id]));
  const byCName = new Map(colleges.map((c) => [c.name.toLowerCase(), c.id]));
  const faculties = await db.select().from(externalFaculty).where(eq(externalFaculty.departmentId, dept));
  const byMobile = new Map(faculties.map((f) => [f.mobileNumber, f.id]));
  const byFName = new Map<string, number | null>();
  for (const f of faculties) { const k = f.name.toLowerCase(); byFName.set(k, byFName.has(k) ? null : f.id); }
  const courses = await db.select().from(course).where(eq(course.departmentId, dept));
  const courseKey = new Map<string, number>();
  for (const c of courses) { courseKey.set(c.name.toLowerCase(), c.id); if (c.shortName) courseKey.set(c.shortName.toLowerCase(), c.id); }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNo = i + 2;
    try {
      if (Object.values(r).every((v) => str(v) === "")) continue;
      if (entity === "colleges") {
        const v = parseCollege({
          name: pick(r, "collegename", "name"),
          shortName: pick(r, "collegeshortname", "shortname", "short"),
          distanceFromDU: pick(r, "distancefromdu", "distance", "distancekm", "km") ?? 0,
        }, dept);
        const exists = byShort.has(v.shortName.toLowerCase());
        const [row] = await db.insert(college).values(v)
          .onConflictDoUpdate({ target: [college.departmentId, college.shortName], set: v }).returning();
        byShort.set(row.shortName.toLowerCase(), row.id); byCName.set(row.name.toLowerCase(), row.id);
        exists ? result.updated++ : result.inserted++;
      } else if (entity === "faculty") {
        const cRef = str(pick(r, "collegeshortname", "college", "collegename", "organization"));
        const collegeId = byShort.get(cRef.toLowerCase()) ?? byCName.get(cRef.toLowerCase());
        if (!collegeId) throw new HttpError(400, `College "${cRef}" not found - add/import the college first.`);
        const v = await parseFaculty({
          name: pick(r, "externalfacultyname", "facultyname", "nameoftheexternalexaminer", "name"),
          designation: pick(r, "designation"),
          department: pick(r, "department", "dept"),
          mobileNumber: pick(r, "mobilenumber", "mobile", "mobileno", "phone"),
          collegeId,
        }, dept);
        const exists = byMobile.has(v.mobileNumber);
        const [row] = await db.insert(externalFaculty).values(v)
          .onConflictDoUpdate({ target: [externalFaculty.departmentId, externalFaculty.mobileNumber], set: v }).returning();
        byMobile.set(row.mobileNumber, row.id);
        exists ? result.updated++ : result.inserted++;
      } else if (entity === "bank-details") {
        const mobile = str(pick(r, "facultymobile", "mobilenumber", "mobile", "mobileno")).replace(/\D/g, "").slice(-10);
        const fname = str(pick(r, "externalfacultyname", "facultyname", "faculty")).toLowerCase();
        let facultyId = (mobile && byMobile.get(mobile)) || undefined;
        if (!facultyId && fname) {
          const id = byFName.get(fname);
          if (id === null) throw new HttpError(400, `More than one faculty named "${fname}" - use Faculty Mobile column.`);
          facultyId = id;
        }
        if (!facultyId) throw new HttpError(400, "Faculty not found - give Faculty Mobile (or Faculty Name) of an existing faculty.");
        const v = await parseBank({
          nameAsPerBank: pick(r, "nameasperbank", "accountname", "accountholdername"),
          bankName: pick(r, "bankname", "bank"),
          ifscCode: pick(r, "ifsccode", "ifsc"),
          branchName: pick(r, "branchname", "branch", "bankbranch"),
          accountNumber: pick(r, "accountnumber", "accountno", "account"),
          externalFacultyId: facultyId,
        }, dept);
        const [existing] = await db.select({ id: bankDetails.id }).from(bankDetails).where(eq(bankDetails.externalFacultyId, facultyId));
        await db.insert(bankDetails).values(v).onConflictDoUpdate({ target: bankDetails.externalFacultyId, set: v });
        existing ? result.updated++ : result.inserted++;
      } else if (entity === "fuel-types") {
        const name = str(pick(r, "fueltypename", "fuletypename", "fueltype", "fuletype", "name"));
        const fixedRaw = pick(r, "isfixedamount", "fixed", "isfixed", "fixedamount");
        const v = parseFuel({ name, ratePerKM: pick(r, "rateperkm", "rate", "amount"),
          isFixedAmount: fixedRaw === undefined ? /local/i.test(name) : fixedRaw }, dept);
        const [existing] = await db.select({ id: fuelType.id }).from(fuelType).where(and(eq(fuelType.departmentId, dept), eq(fuelType.name, v.name)));
        await db.insert(fuelType).values(v).onConflictDoUpdate({ target: [fuelType.departmentId, fuelType.name], set: v });
        existing ? result.updated++ : result.inserted++;
      } else if (entity === "courses") {
        const v = parseCourse({ name: pick(r, "coursename", "course", "name", "programsem", "program"),
          shortName: pick(r, "courseshortname", "shortname", "short") }, dept);
        const exists = courseKey.has(v.name.toLowerCase());
        const [row] = await db.insert(course).values(v)
          .onConflictDoUpdate({ target: [course.departmentId, course.name], set: v }).returning();
        courseKey.set(row.name.toLowerCase(), row.id); if (row.shortName) courseKey.set(row.shortName.toLowerCase(), row.id);
        exists ? result.updated++ : result.inserted++;
      } else if (entity === "subjects") {
        const cRef = str(pick(r, "coursename", "course", "courseshortname", "programsem", "program"));
        const courseId = courseKey.get(cRef.toLowerCase());
        if (!courseId) throw new HttpError(400, `Course "${cRef}" not found - add/import the course first.`);
        const v = await parseSubject({
          courseId, code: pick(r, "subjectcode", "code"), name: pick(r, "subjectname", "name", "subject"),
          shortName: pick(r, "subjectshortname", "shortname", "short"),
        }, dept);
        const [existing] = await db.select({ id: subject.id }).from(subject).where(and(eq(subject.courseId, courseId), eq(subject.code, v.code)));
        await db.insert(subject).values(v).onConflictDoUpdate({ target: [subject.courseId, subject.code], set: v });
        existing ? result.updated++ : result.inserted++;
      }
    } catch (e) {
      result.errors.push({ row: rowNo, message: e instanceof HttpError ? e.message : (e as Error).message });
    }
  }
  return result;
}
