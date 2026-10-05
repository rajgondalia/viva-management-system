CREATE TABLE IF NOT EXISTS "BankDetails" (
	"BankDetailsID" serial PRIMARY KEY NOT NULL,
	"NameAsPerBank" text NOT NULL,
	"BankName" text NOT NULL,
	"IFSCCode" text NOT NULL,
	"BranchName" text DEFAULT '' NOT NULL,
	"AccountNumber" text NOT NULL,
	"ExternalFacultyID" integer NOT NULL,
	"CreatedAt" timestamp DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "BankDetails_ExternalFacultyID_unique" UNIQUE("ExternalFacultyID")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Bill" (
	"BillID" serial PRIMARY KEY NOT NULL,
	"BillNo" text,
	"BillDate" date NOT NULL,
	"ExternalFacultyID" integer NOT NULL,
	"Purpose" text DEFAULT 'External Viva Examination' NOT NULL,
	"PreApproval" boolean DEFAULT false NOT NULL,
	"TravelDate" date NOT NULL,
	"TravelFrom" text NOT NULL,
	"TravelTo" text NOT NULL,
	"FuelTypeID" integer,
	"TravelMode" text NOT NULL,
	"IsFixedTravel" boolean DEFAULT false NOT NULL,
	"OneWayKM" double precision DEFAULT 0 NOT NULL,
	"TotalKM" double precision DEFAULT 0 NOT NULL,
	"TravelRate" double precision DEFAULT 0 NOT NULL,
	"TravelAmount" double precision DEFAULT 0 NOT NULL,
	"DADate" date NOT NULL,
	"DANature" text DEFAULT 'Viva' NOT NULL,
	"DARate" double precision DEFAULT 200 NOT NULL,
	"DAAmount" double precision DEFAULT 200 NOT NULL,
	"HonorariumAmount" double precision DEFAULT 0 NOT NULL,
	"MiscDetails" text DEFAULT '' NOT NULL,
	"MiscAmount" double precision DEFAULT 0 NOT NULL,
	"MiscRemarks" text DEFAULT '' NOT NULL,
	"TotalAmount" double precision DEFAULT 0 NOT NULL,
	"AdvanceAmount" double precision DEFAULT 0 NOT NULL,
	"GrandTotal" double precision DEFAULT 0 NOT NULL,
	"Remarks" text DEFAULT '' NOT NULL,
	"CreatedAt" timestamp DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Bill_BillNo_unique" UNIQUE("BillNo")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "BillExamItem" (
	"BillExamItemID" serial PRIMARY KEY NOT NULL,
	"BillID" integer NOT NULL,
	"ExamDate" date NOT NULL,
	"NatureOfDuty" text DEFAULT 'Viva' NOT NULL,
	"SubjectCode" text DEFAULT '' NOT NULL,
	"SubjectName" text DEFAULT '' NOT NULL,
	"NoOfStudents" integer DEFAULT 0 NOT NULL,
	"BaseAmount" double precision DEFAULT 0 NOT NULL,
	"ExtraAmount" double precision DEFAULT 0 NOT NULL,
	"Amount" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "College" (
	"CollegeID" serial PRIMARY KEY NOT NULL,
	"CollegeName" text NOT NULL,
	"CollegeShortName" text NOT NULL,
	"DistanceFromDU" double precision DEFAULT 0 NOT NULL,
	"CreatedAt" timestamp DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "College_CollegeShortName_unique" UNIQUE("CollegeShortName")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ExternalFaculty" (
	"ExternalFacultyID" serial PRIMARY KEY NOT NULL,
	"ExternalFacultyName" text NOT NULL,
	"Designation" text DEFAULT '' NOT NULL,
	"Department" text DEFAULT '' NOT NULL,
	"MobileNumber" text NOT NULL,
	"CollegeID" integer NOT NULL,
	"CreatedAt" timestamp DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ExternalFaculty_MobileNumber_unique" UNIQUE("MobileNumber")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "FuelType" (
	"FuelTypeID" serial PRIMARY KEY NOT NULL,
	"FuelTypeName" text NOT NULL,
	"RatePerKM" double precision DEFAULT 0 NOT NULL,
	"IsFixedAmount" boolean DEFAULT false NOT NULL,
	"CreatedAt" timestamp DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "FuelType_FuelTypeName_unique" UNIQUE("FuelTypeName")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Setting" (
	"SettingID" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"InstituteName" text DEFAULT 'Darshan University' NOT NULL,
	"InstituteShortName" text DEFAULT 'DU' NOT NULL,
	"Place" text DEFAULT 'Rajkot' NOT NULL,
	"BillPrefix" text DEFAULT 'VIVA' NOT NULL,
	"DefaultPurpose" text DEFAULT 'External Viva Examination' NOT NULL,
	"DANature" text DEFAULT 'Viva' NOT NULL,
	"DAAmount" double precision DEFAULT 200 NOT NULL,
	"HonorariumBaseStudents" integer DEFAULT 45 NOT NULL,
	"HonorariumBaseAmount" double precision DEFAULT 500 NOT NULL,
	"HonorariumExtraPerStudent" double precision DEFAULT 15 NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "BankDetails" ADD CONSTRAINT "BankDetails_ExternalFacultyID_ExternalFaculty_ExternalFacultyID_fk" FOREIGN KEY ("ExternalFacultyID") REFERENCES "public"."ExternalFaculty"("ExternalFacultyID") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Bill" ADD CONSTRAINT "Bill_ExternalFacultyID_ExternalFaculty_ExternalFacultyID_fk" FOREIGN KEY ("ExternalFacultyID") REFERENCES "public"."ExternalFaculty"("ExternalFacultyID") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Bill" ADD CONSTRAINT "Bill_FuelTypeID_FuelType_FuelTypeID_fk" FOREIGN KEY ("FuelTypeID") REFERENCES "public"."FuelType"("FuelTypeID") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "BillExamItem" ADD CONSTRAINT "BillExamItem_BillID_Bill_BillID_fk" FOREIGN KEY ("BillID") REFERENCES "public"."Bill"("BillID") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ExternalFaculty" ADD CONSTRAINT "ExternalFaculty_CollegeID_College_CollegeID_fk" FOREIGN KEY ("CollegeID") REFERENCES "public"."College"("CollegeID") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Bill_BillDate_idx" ON "Bill" USING btree ("BillDate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Bill_Faculty_idx" ON "Bill" USING btree ("ExternalFacultyID");