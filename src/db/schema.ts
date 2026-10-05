/**
 * Viva Management System - Database schema (PostgreSQL, Drizzle ORM)
 * Table / column names follow the requirement document (CollegeID, CollegeName ...)
 *
 * Multi-department: every data table carries DepartmentID. A department user only sees
 * rows of their own department (enforced in every API via the session).
 */
import { relations } from "drizzle-orm";
import {
  boolean, customType, date, doublePrecision, index, integer, pgTable, serial, text, timestamp, unique,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

const stamps = {
  createdAt: timestamp("CreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("UpdatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
};

/* ============================== Access control ============================== */

/** Department - e.g. "DIET CSE", "DIET DS". All data belongs to one department. */
export const department = pgTable("Department", {
  id: serial("DepartmentID").primaryKey(),
  name: text("DepartmentName").notNull().unique(),
  description: text("Description").notNull().default(""),
  ...stamps,
});

/** AppUser - login accounts. role: "admin" (all departments, user management) | "user" (own department) */
export const appUser = pgTable("AppUser", {
  id: serial("UserID").primaryKey(),
  username: text("Username").notNull().unique(),
  fullName: text("FullName").notNull().default(""),
  passwordHash: text("PasswordHash").notNull(),
  role: text("Role").notNull().default("user"),
  departmentId: integer("DepartmentID").references(() => department.id, { onDelete: "restrict" }),
  isActive: boolean("IsActive").notNull().default(true),
  ...stamps,
});

/** Document - uploaded PDFs (RC book / bank proof), stored in the database (no extra storage service) */
export const document = pgTable("Document", {
  id: serial("DocumentID").primaryKey(),
  departmentId: integer("DepartmentID").notNull().references(() => department.id, { onDelete: "cascade" }),
  fileName: text("FileName").notNull(),
  mimeType: text("MimeType").notNull().default("application/pdf"),
  size: integer("Size").notNull().default(0),
  data: bytea("Data").notNull(),
  createdAt: timestamp("CreatedAt").defaultNow().notNull(),
});

/* ============================== Masters ============================== */

/** CollegeTable */
export const college = pgTable("College", {
  id: serial("CollegeID").primaryKey(),
  departmentId: integer("DepartmentID").notNull().references(() => department.id, { onDelete: "cascade" }),
  name: text("CollegeName").notNull(),
  shortName: text("CollegeShortName").notNull(),
  distanceFromDU: doublePrecision("DistanceFromDU").notNull().default(0), // one-way KM
  ...stamps,
}, (t) => [unique("College_Dept_ShortName_unique").on(t.departmentId, t.shortName)]);

/** ExternalFaculty (Staff) */
export const externalFaculty = pgTable("ExternalFaculty", {
  id: serial("ExternalFacultyID").primaryKey(),
  departmentId: integer("DepartmentID").notNull().references(() => department.id, { onDelete: "cascade" }),
  name: text("ExternalFacultyName").notNull(),
  designation: text("Designation").notNull().default(""),
  department: text("Department").notNull().default(""),
  mobileNumber: text("MobileNumber").notNull(),
  collegeId: integer("CollegeID").notNull().references(() => college.id, { onDelete: "restrict" }),
  rcDocumentId: integer("RCDocumentID").references(() => document.id, { onDelete: "set null" }), // car RC / other docs (optional)
  ...stamps,
}, (t) => [unique("ExternalFaculty_Dept_Mobile_unique").on(t.departmentId, t.mobileNumber)]);

/** BankDetails - one account per external faculty */
export const bankDetails = pgTable("BankDetails", {
  id: serial("BankDetailsID").primaryKey(),
  departmentId: integer("DepartmentID").notNull().references(() => department.id, { onDelete: "cascade" }),
  nameAsPerBank: text("NameAsPerBank").notNull(),
  bankName: text("BankName").notNull(),
  ifscCode: text("IFSCCode").notNull(),
  branchName: text("BranchName").notNull().default(""),
  accountNumber: text("AccountNumber").notNull(),
  externalFacultyId: integer("ExternalFacultyID").notNull().unique()
    .references(() => externalFaculty.id, { onDelete: "cascade" }),
  proofDocumentId: integer("ProofDocumentID").references(() => document.id, { onDelete: "set null" }), // passbook / cancelled cheque (optional)
  ...stamps,
});

/** FuelType - IsFixedAmount=true means RatePerKM is a fixed amount (e.g. Local = 200) */
export const fuelType = pgTable("FuelType", {
  id: serial("FuelTypeID").primaryKey(),
  departmentId: integer("DepartmentID").notNull().references(() => department.id, { onDelete: "cascade" }),
  name: text("FuelTypeName").notNull(),
  ratePerKM: doublePrecision("RatePerKM").notNull().default(0),
  isFixedAmount: boolean("IsFixedAmount").notNull().default(false),
  ...stamps,
}, (t) => [unique("FuelType_Dept_Name_unique").on(t.departmentId, t.name)]);

/** Course - e.g. "B.Tech + Hons Sem 5" (ShortName "Btech-5" is used in Excel Program-Sem) */
export const course = pgTable("Course", {
  id: serial("CourseID").primaryKey(),
  departmentId: integer("DepartmentID").notNull().references(() => department.id, { onDelete: "cascade" }),
  name: text("CourseName").notNull(),
  shortName: text("CourseShortName").notNull().default(""),
  ...stamps,
}, (t) => [unique("Course_Dept_Name_unique").on(t.departmentId, t.name)]);

/** Subject - course-wise. ShortName is printed on the bill PDF. */
export const subject = pgTable("Subject", {
  id: serial("SubjectID").primaryKey(),
  departmentId: integer("DepartmentID").notNull().references(() => department.id, { onDelete: "cascade" }),
  courseId: integer("CourseID").notNull().references(() => course.id, { onDelete: "restrict" }),
  code: text("SubjectCode").notNull(),
  name: text("SubjectName").notNull(),
  shortName: text("SubjectShortName").notNull().default(""),
  ...stamps,
}, (t) => [unique("Subject_Course_Code_unique").on(t.courseId, t.code)]);

/* ============================== Bills ============================== */

/**
 * Bill - header + Part A (Travel) + Part B (DA) + Part D (Misc) + Summary.
 * Calculated values are stored as a snapshot so changing masters never alters old bills.
 */
export const bill = pgTable("Bill", {
  id: serial("BillID").primaryKey(),
  departmentId: integer("DepartmentID").notNull().references(() => department.id, { onDelete: "cascade" }),
  billNo: text("BillNo").unique(),
  billDate: date("BillDate").notNull(),
  externalFacultyId: integer("ExternalFacultyID").notNull()
    .references(() => externalFaculty.id, { onDelete: "restrict" }),
  purpose: text("Purpose").notNull().default("External Viva Examination"),
  preApproval: boolean("PreApproval").notNull().default(false),
  billDone: boolean("BillDone").notNull().default(false),

  // Part A : Travel Allowance
  travelDate: date("TravelDate").notNull(),
  travelFrom: text("TravelFrom").notNull(),
  travelTo: text("TravelTo").notNull(),
  fuelTypeId: integer("FuelTypeID").references(() => fuelType.id, { onDelete: "set null" }),
  travelMode: text("TravelMode").notNull(),
  isFixedTravel: boolean("IsFixedTravel").notNull().default(false),
  oneWayKm: doublePrecision("OneWayKM").notNull().default(0),
  totalKm: doublePrecision("TotalKM").notNull().default(0),
  travelRate: doublePrecision("TravelRate").notNull().default(0),
  travelAmount: doublePrecision("TravelAmount").notNull().default(0),

  // Part B : Dearness Allowance
  daDate: date("DADate").notNull(),
  daNature: text("DANature").notNull().default("Viva"),
  daRate: doublePrecision("DARate").notNull().default(200),
  daAmount: doublePrecision("DAAmount").notNull().default(200),

  // Part C : Examination Honorarium - calculated on TOTAL students of all rows
  totalStudents: integer("TotalStudents").notNull().default(0),
  honorariumBase: doublePrecision("HonorariumBase").notNull().default(0),
  honorariumExtra: doublePrecision("HonorariumExtra").notNull().default(0),
  honorariumAmount: doublePrecision("HonorariumAmount").notNull().default(0),

  // Part D : Miscellaneous (optional)
  miscDetails: text("MiscDetails").notNull().default(""),
  miscAmount: doublePrecision("MiscAmount").notNull().default(0),
  miscRemarks: text("MiscRemarks").notNull().default(""),

  // Summary
  totalAmount: doublePrecision("TotalAmount").notNull().default(0),
  advanceAmount: doublePrecision("AdvanceAmount").notNull().default(0),
  grandTotal: doublePrecision("GrandTotal").notNull().default(0),
  remarks: text("Remarks").notNull().default(""),
  ...stamps,
}, (t) => [
  index("Bill_BillDate_idx").on(t.billDate),
  index("Bill_Faculty_idx").on(t.externalFacultyId),
  index("Bill_Dept_idx").on(t.departmentId),
]);

/** BillExamItem - Part C rows: one per course + subject */
export const billExamItem = pgTable("BillExamItem", {
  id: serial("BillExamItemID").primaryKey(),
  billId: integer("BillID").notNull().references(() => bill.id, { onDelete: "cascade" }),
  examDate: date("ExamDate").notNull(),
  natureOfDuty: text("NatureOfDuty").notNull().default("Viva"),
  courseId: integer("CourseID").references(() => course.id, { onDelete: "set null" }),
  courseName: text("CourseName").notNull().default(""),
  courseShortName: text("CourseShortName").notNull().default(""),
  subjectId: integer("SubjectID").references(() => subject.id, { onDelete: "set null" }),
  subjectCode: text("SubjectCode").notNull().default(""),
  subjectName: text("SubjectName").notNull().default(""),
  subjectShortName: text("SubjectShortName").notNull().default(""),
  noOfStudents: integer("NoOfStudents").notNull().default(0),
  baseAmount: doublePrecision("BaseAmount").notNull().default(0),   // legacy (per-row calculation)
  extraAmount: doublePrecision("ExtraAmount").notNull().default(0), // legacy
  amount: doublePrecision("Amount").notNull().default(0),           // legacy
});

/** Setting - one row per department (SettingID = DepartmentID) */
export const setting = pgTable("Setting", {
  id: integer("SettingID").primaryKey().default(1),
  departmentId: integer("DepartmentID").notNull().unique().references(() => department.id, { onDelete: "cascade" }),
  instituteName: text("InstituteName").notNull().default("Darshan University"),
  instituteShortName: text("InstituteShortName").notNull().default("DU"),
  place: text("Place").notNull().default("Rajkot"),
  billPrefix: text("BillPrefix").notNull().default("VIVA"),
  defaultPurpose: text("DefaultPurpose").notNull().default("External Viva Examination"),
  daNature: text("DANature").notNull().default("Viva"),
  daAmount: doublePrecision("DAAmount").notNull().default(200),
  honorariumBaseStudents: integer("HonorariumBaseStudents").notNull().default(45),
  honorariumBaseAmount: doublePrecision("HonorariumBaseAmount").notNull().default(500),
  honorariumExtraPerStudent: doublePrecision("HonorariumExtraPerStudent").notNull().default(15),
});

/* ============================== relations ============================== */
export const facultyRelations = relations(externalFaculty, ({ one, many }) => ({
  college: one(college, { fields: [externalFaculty.collegeId], references: [college.id] }),
  bankDetails: one(bankDetails, { fields: [externalFaculty.id], references: [bankDetails.externalFacultyId] }),
  bills: many(bill),
}));
export const collegeRelations = relations(college, ({ many }) => ({ faculties: many(externalFaculty) }));
export const bankRelations = relations(bankDetails, ({ one }) => ({
  faculty: one(externalFaculty, { fields: [bankDetails.externalFacultyId], references: [externalFaculty.id] }),
}));
export const billRelations = relations(bill, ({ one, many }) => ({
  faculty: one(externalFaculty, { fields: [bill.externalFacultyId], references: [externalFaculty.id] }),
  fuelType: one(fuelType, { fields: [bill.fuelTypeId], references: [fuelType.id] }),
  examItems: many(billExamItem),
}));
export const examItemRelations = relations(billExamItem, ({ one }) => ({
  bill: one(bill, { fields: [billExamItem.billId], references: [bill.id] }),
}));

export type Department = typeof department.$inferSelect;
export type AppUser = typeof appUser.$inferSelect;
export type Setting = typeof setting.$inferSelect;
