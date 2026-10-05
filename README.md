# Viva Management System

External examiner (viva) TA / DA / Honorarium bill portal — Darshan University.

## Features

- **Dashboard** – total bills, this-month amount, last 6 months chart, part-wise split, top colleges, recent bills
- **Masters** – College, External Faculty, Bank Details, Fuel Type: add / edit / delete / search, **Excel import** (with template) and Excel export
- **Create New Bill** – searchable faculty dropdown, auto-filled college & distance, fuel type dropdown, live calculation of Part A + B + C (+ optional D), advance, grand total in words
- **Bill History** – date-wise or faculty-wise list, date-range filter (+ Today / This month / Last month / This year), faculty & college filters, search, edit, delete, **PDF download**, **Excel export & import**
- **PDF** – 2-page bill in the same format as "Bill for Reimbursement of Allowances/Honorarium" with every calculation, bank details and amount in words
- **Settings** – DA amount, honorarium slab (45 students / ₹500 / ₹15), institute name, place, bill prefix
- **Department-wise login** – each department (DIET CSE, DIET DS, …) has its own login and sees **only its own** faculty, colleges, courses, bills, dashboard and settings. Super admin adds departments & users and can switch between departments.
- **Courses & course-wise subjects** – Course (e.g. *B.Tech + Hons Sem 5*) and Subject (code, name, **short name** – printed on the PDF). One bill can have many courses + subjects; honorarium is on the **total students**.
- **PDF uploads (optional)** – faculty documents (car RC book etc. combined in one PDF) and bank proof (passbook / cancelled cheque), max 4 MB each, stored in the database.
- **Bill List Excel** – Bill History → *Export Excel* downloads the selected date range in the institute "Bill List" format (Sr. No, Date, Program-Sem, Bill Done, … Number of Student) with SUM formulas.
- **Bill Done** status – Done / Pending on every bill (click the badge in Bill History to change).

## Calculation rules

| Part | Rule | Example |
|---|---|---|
| A. Travel Allowance | Per-KM fuel: (one-way KM × 2) × RatePerKM | Atmiya 20 km, Petrol ₹12 → 240 + 240 = **₹480** |
| | Fixed fuel type (e.g. Local) | **₹200** (the amount in the Fuel Type table) |
| B. Dearness Allowance | Fixed, Nature "Viva" | **₹200** |
| C. Examination Honorarium | On **total students of all subjects in the bill**: ≤ 45 → ₹500; above → ₹500 + (total − 45) × ₹15 | 40 + 12 = 52 students → 500 + 7×15 = **₹605** |
| Summary | A + B + C (+ D) − Advance | |

The bill PDF always shows at least 3 rows in Parts A, B and C (blank rows when there is no data). All rules are editable in **Settings**, and every bill stores its own calculated values, so later rate changes never alter old bills.

## Technology (free to host)

| Layer | Tech |
|---|---|
| Frontend + Backend | **Next.js 14** (App Router, React, TypeScript) – API routes in the same project |
| UI | Tailwind CSS, lucide-react icons |
| Database | **PostgreSQL** with **Drizzle ORM** (pure JS, no binaries) |
| Excel | SheetJS (`xlsx`) – parsed in the browser |
| PDF | jsPDF + jspdf-autotable – generated in the browser |
| Free hosting | **Vercel** (app) + **Neon** (Postgres, 0.5 GB free) |

## Folder structure

```
viva-management-system/
├── drizzle/                     # SQL migrations (auto-applied on build)
│   └── 0000_init.sql
├── public/
│   ├── logo.png                 # Darshan University logo (UI)
│   └── logo-white.png           # logo used inside the PDF
├── scripts/
│   ├── migrate.mjs              # applies migrations + default settings & fuel types
│   └── seed.mjs                 # optional demo data
├── src/
│   ├── middleware.ts            # login protection for all pages & APIs
│   ├── db/
│   │   └── schema.ts            # all tables (College, ExternalFaculty, BankDetails, FuelType, Bill, BillExamItem, Setting)
│   ├── lib/
│   │   ├── calc.ts              # ★ calculation rules (shared by browser & server)
│   │   ├── bills.ts             # bill create/update/list/import, dashboard stats
│   │   ├── masters.ts           # master CRUD + Excel import mapping
│   │   ├── pdf.ts               # PDF in the official bill format
│   │   ├── excel.ts             # Excel read / download
│   │   ├── format.ts            # money, dates, amount in words (Indian system)
│   │   ├── session.ts  guard.ts  password.ts   # department-wise login
│   │   ├── admin.ts  departments.ts  documents.ts  billExcel.ts
│   │   ├── auth.ts  http.ts  db.ts  client.ts
│   ├── components/
│   │   ├── Shell.tsx            # sidebar menu + layout
│   │   ├── BillForm.tsx         # create / edit bill screen
│   │   ├── MasterPage.tsx       # generic list + form + import for masters
│   │   ├── ImportDialog.tsx     # Excel import with preview & error report
│   │   └── ui.tsx               # modal, toast, confirm, searchable dropdown
│   └── app/
│       ├── login/page.tsx
│       ├── (app)/               # pages with sidebar
│       │   ├── page.tsx                 # Dashboard
│       │   ├── bills/page.tsx           # Bill History
│       │   ├── bills/new/page.tsx       # Create New Bill
│       │   ├── bills/[id]/page.tsx      # Edit Bill
│       │   ├── faculty/ colleges/ fuel-types/ bank-details/ settings/
│       │   ├── courses/ subjects/ users/
│       └── api/
│           ├── auth/login, auth/logout
│           ├── masters/[entity]          # GET, POST   (colleges | faculty | bank-details | fuel-types)
│           ├── masters/[entity]/[id]     # PUT, DELETE
│           ├── import/[entity]           # POST rows from Excel (also "bills")
│           ├── bills, bills/[id]         # list (filters) / create / get / update / delete
│           ├── dashboard, settings, documents, bills/export
│           ├── admin/departments, admin/users      # super admin only
├── .env.example
├── drizzle.config.ts  next.config.mjs  tailwind.config.ts  package.json
```

## Database tables

`College`(CollegeID, CollegeName, CollegeShortName, DistanceFromDU) ·
`ExternalFaculty`(ExternalFacultyID, ExternalFacultyName, Designation, Department, MobileNumber, CollegeID→College) ·
`BankDetails`(BankDetailsID, NameAsPerBank, BankName, IFSCCode, BranchName, AccountNumber, ExternalFacultyID→ExternalFaculty) ·
`FuelType`(FuelTypeID, FuelTypeName, RatePerKM, **IsFixedAmount**) ·
`Bill` (header + Part A/B/D snapshot + totals) ·
`BillExamItem` (Part C rows: date, nature of duty, subject code/name, students, base, extra, amount) ·
`Course`(CourseID, CourseName, CourseShortName) ·
`Subject`(SubjectID, CourseID→Course, SubjectCode, SubjectName, SubjectShortName) ·
`Department`, `AppUser` (department-wise logins) · `Document` (uploaded PDFs) ·
`Setting` (rules, one row per department). Every data table has `DepartmentID`.

## Run locally

Requirements: Node.js 18+ and a PostgreSQL database (local, or a free Neon database).

```bash
npm install
cp .env.example .env        # put your DATABASE_URL and admin password
npm run db:migrate          # create tables
npm run db:seed             # (optional) demo colleges & faculty
npm run dev                 # http://localhost:3000
```

## Free deployment – Vercel + Neon (≈10 minutes)

1. **Database** – sign up at <https://neon.tech> → *Create project* → copy the **connection string** (`postgresql://...?sslmode=require`).
2. **Code on GitHub** – create a new repository and push this folder (`git init && git add . && git commit -m "init" && git push`).
3. **Vercel** – sign up at <https://vercel.com> with GitHub → *Add New → Project* → import the repository.
4. In *Environment Variables* add:
   - `DATABASE_URL` = Neon connection string
   - `ADMIN_USERNAME` = your login name
   - `ADMIN_PASSWORD` = a strong password
   - `AUTH_SECRET` = any long random text
5. Click **Deploy**. The build runs the migrations automatically and creates default fuel types (Petrol 12, Diesel 10, CNG 8, Electric 5, Local 200 fixed).
6. Open the `*.vercel.app` URL, log in, then: Colleges → Faculty → Bank Details (import Excel or add) → Create New Bill.

Every `git push` redeploys automatically. Neon free tier sleeps when idle – the first request after a while may take ~1 s.

> Supabase (free Postgres) also works: use its *Session pooler* connection string as `DATABASE_URL`.

## Excel import columns

Headers are case/space-insensitive. Each import screen has a **Template** button.

| Table | Columns |
|---|---|
| Colleges | CollegeName, CollegeShortName, DistanceFromDU |
| Faculty | ExternalFacultyName, Designation, Department, MobileNumber, CollegeShortName |
| Bank Details | FacultyMobile, NameAsPerBank, BankName, BranchName, AccountNumber, IFSCCode |
| Fuel Types | FuelTypeName, RatePerKM, IsFixedAmount (Yes/No) |
| Courses | CourseName, CourseShortName |
| Subjects | CourseName, SubjectCode, SubjectName, SubjectShortName |
| Bills | BillDate, FacultyMobile, FuelType, OneWayKM (blank = college distance), CourseName, SubjectCode, SubjectName, NoOfStudents, BillDone, ExamDate, AdvanceAmount, Remarks |

Re-importing updates existing records (matched by Short Name / Mobile / Fuel name). Rows with errors are skipped and listed with row numbers.

## Notes

- `xlsx` is pinned to the npm build 0.18.5. For the latest SheetJS you can replace it with
  `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"` in package.json.
- **Super admin** login = `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env` (default `admin` / `admin123` – change it).
  Log in as super admin → *Users & Departments* → add departments (e.g. DIET DS) and a login for each (e.g. `dietcse`, `dietds`).
- Upgrading from the first version: run `npm install` and `npm run db:migrate`. Existing data is moved into the department **DIET CSE** (rename it any time).
