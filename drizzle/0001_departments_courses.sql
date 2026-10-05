CREATE TABLE IF NOT EXISTS "AppUser" (
	"UserID" serial PRIMARY KEY NOT NULL,
	"Username" text NOT NULL,
	"FullName" text DEFAULT '' NOT NULL,
	"PasswordHash" text NOT NULL,
	"Role" text DEFAULT 'user' NOT NULL,
	"DepartmentID" integer,
	"IsActive" boolean DEFAULT true NOT NULL,
	"CreatedAt" timestamp DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "AppUser_Username_unique" UNIQUE("Username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Course" (
	"CourseID" serial PRIMARY KEY NOT NULL,
	"DepartmentID" integer NOT NULL,
	"CourseName" text NOT NULL,
	"CourseShortName" text DEFAULT '' NOT NULL,
	"CreatedAt" timestamp DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Course_Dept_Name_unique" UNIQUE("DepartmentID","CourseName")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Department" (
	"DepartmentID" serial PRIMARY KEY NOT NULL,
	"DepartmentName" text NOT NULL,
	"Description" text DEFAULT '' NOT NULL,
	"CreatedAt" timestamp DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Department_DepartmentName_unique" UNIQUE("DepartmentName")
);
--> statement-breakpoint
-- existing data (if any) is moved into this first department; rename it later from Users & Departments
INSERT INTO "Department" ("DepartmentName","Description") VALUES ('DIET CSE', 'Default department') ON CONFLICT DO NOTHING;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Document" (
	"DocumentID" serial PRIMARY KEY NOT NULL,
	"DepartmentID" integer NOT NULL,
	"FileName" text NOT NULL,
	"MimeType" text DEFAULT 'application/pdf' NOT NULL,
	"Size" integer DEFAULT 0 NOT NULL,
	"Data" "bytea" NOT NULL,
	"CreatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Subject" (
	"SubjectID" serial PRIMARY KEY NOT NULL,
	"DepartmentID" integer NOT NULL,
	"CourseID" integer NOT NULL,
	"SubjectCode" text NOT NULL,
	"SubjectName" text NOT NULL,
	"SubjectShortName" text DEFAULT '' NOT NULL,
	"CreatedAt" timestamp DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Subject_Course_Code_unique" UNIQUE("CourseID","SubjectCode")
);
--> statement-breakpoint
ALTER TABLE "College" DROP CONSTRAINT "College_CollegeShortName_unique";--> statement-breakpoint
ALTER TABLE "ExternalFaculty" DROP CONSTRAINT "ExternalFaculty_MobileNumber_unique";--> statement-breakpoint
ALTER TABLE "FuelType" DROP CONSTRAINT "FuelType_FuelTypeName_unique";--> statement-breakpoint
ALTER TABLE "BankDetails" ADD COLUMN "DepartmentID" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "BankDetails" ADD COLUMN "ProofDocumentID" integer;--> statement-breakpoint
ALTER TABLE "Bill" ADD COLUMN "DepartmentID" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "Bill" ADD COLUMN "BillDone" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Bill" ADD COLUMN "TotalStudents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Bill" ADD COLUMN "HonorariumBase" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Bill" ADD COLUMN "HonorariumExtra" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "BillExamItem" ADD COLUMN "CourseID" integer;--> statement-breakpoint
ALTER TABLE "BillExamItem" ADD COLUMN "CourseName" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "BillExamItem" ADD COLUMN "CourseShortName" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "BillExamItem" ADD COLUMN "SubjectID" integer;--> statement-breakpoint
ALTER TABLE "BillExamItem" ADD COLUMN "SubjectShortName" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "College" ADD COLUMN "DepartmentID" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "ExternalFaculty" ADD COLUMN "DepartmentID" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "ExternalFaculty" ADD COLUMN "RCDocumentID" integer;--> statement-breakpoint
ALTER TABLE "FuelType" ADD COLUMN "DepartmentID" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "Setting" ADD COLUMN "DepartmentID" integer NOT NULL DEFAULT 1;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_DepartmentID_Department_DepartmentID_fk" FOREIGN KEY ("DepartmentID") REFERENCES "public"."Department"("DepartmentID") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Course" ADD CONSTRAINT "Course_DepartmentID_Department_DepartmentID_fk" FOREIGN KEY ("DepartmentID") REFERENCES "public"."Department"("DepartmentID") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Document" ADD CONSTRAINT "Document_DepartmentID_Department_DepartmentID_fk" FOREIGN KEY ("DepartmentID") REFERENCES "public"."Department"("DepartmentID") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Subject" ADD CONSTRAINT "Subject_DepartmentID_Department_DepartmentID_fk" FOREIGN KEY ("DepartmentID") REFERENCES "public"."Department"("DepartmentID") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Subject" ADD CONSTRAINT "Subject_CourseID_Course_CourseID_fk" FOREIGN KEY ("CourseID") REFERENCES "public"."Course"("CourseID") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "BankDetails" ADD CONSTRAINT "BankDetails_DepartmentID_Department_DepartmentID_fk" FOREIGN KEY ("DepartmentID") REFERENCES "public"."Department"("DepartmentID") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "BankDetails" ADD CONSTRAINT "BankDetails_ProofDocumentID_Document_DocumentID_fk" FOREIGN KEY ("ProofDocumentID") REFERENCES "public"."Document"("DocumentID") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Bill" ADD CONSTRAINT "Bill_DepartmentID_Department_DepartmentID_fk" FOREIGN KEY ("DepartmentID") REFERENCES "public"."Department"("DepartmentID") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "BillExamItem" ADD CONSTRAINT "BillExamItem_CourseID_Course_CourseID_fk" FOREIGN KEY ("CourseID") REFERENCES "public"."Course"("CourseID") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "BillExamItem" ADD CONSTRAINT "BillExamItem_SubjectID_Subject_SubjectID_fk" FOREIGN KEY ("SubjectID") REFERENCES "public"."Subject"("SubjectID") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "College" ADD CONSTRAINT "College_DepartmentID_Department_DepartmentID_fk" FOREIGN KEY ("DepartmentID") REFERENCES "public"."Department"("DepartmentID") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ExternalFaculty" ADD CONSTRAINT "ExternalFaculty_DepartmentID_Department_DepartmentID_fk" FOREIGN KEY ("DepartmentID") REFERENCES "public"."Department"("DepartmentID") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ExternalFaculty" ADD CONSTRAINT "ExternalFaculty_RCDocumentID_Document_DocumentID_fk" FOREIGN KEY ("RCDocumentID") REFERENCES "public"."Document"("DocumentID") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "FuelType" ADD CONSTRAINT "FuelType_DepartmentID_Department_DepartmentID_fk" FOREIGN KEY ("DepartmentID") REFERENCES "public"."Department"("DepartmentID") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Setting" ADD CONSTRAINT "Setting_DepartmentID_Department_DepartmentID_fk" FOREIGN KEY ("DepartmentID") REFERENCES "public"."Department"("DepartmentID") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Bill_Dept_idx" ON "Bill" USING btree ("DepartmentID");--> statement-breakpoint
ALTER TABLE "College" ADD CONSTRAINT "College_Dept_ShortName_unique" UNIQUE("DepartmentID","CollegeShortName");--> statement-breakpoint
ALTER TABLE "ExternalFaculty" ADD CONSTRAINT "ExternalFaculty_Dept_Mobile_unique" UNIQUE("DepartmentID","MobileNumber");--> statement-breakpoint
ALTER TABLE "FuelType" ADD CONSTRAINT "FuelType_Dept_Name_unique" UNIQUE("DepartmentID","FuelTypeName");--> statement-breakpoint
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_DepartmentID_unique" UNIQUE("DepartmentID");
--> statement-breakpoint
ALTER TABLE "BankDetails" ALTER COLUMN "DepartmentID" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "Bill" ALTER COLUMN "DepartmentID" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "College" ALTER COLUMN "DepartmentID" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "ExternalFaculty" ALTER COLUMN "DepartmentID" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "FuelType" ALTER COLUMN "DepartmentID" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "Setting" ALTER COLUMN "DepartmentID" DROP DEFAULT;
--> statement-breakpoint
UPDATE "Bill" b SET "TotalStudents" = COALESCE((SELECT SUM(i."NoOfStudents") FROM "BillExamItem" i WHERE i."BillID" = b."BillID"),0);
--> statement-breakpoint
UPDATE "BillExamItem" SET "SubjectShortName" = "SubjectName" WHERE "SubjectShortName" = '';
