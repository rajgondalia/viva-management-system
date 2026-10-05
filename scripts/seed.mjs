// Optional demo data: `npm run db:seed` (safe to run multiple times)
import pg from "pg";
import fs from "node:fs";

if (fs.existsSync(".env")) for (const l of fs.readFileSync(".env", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const ssl = /sslmode=require|neon\.tech|supabase/.test(process.env.DATABASE_URL || "") ? { rejectUnauthorized: false } : undefined;
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl });
await c.connect();
const { rows: [dep] } = await c.query(`SELECT "DepartmentID" AS id FROM "Department" ORDER BY "DepartmentID" LIMIT 1`);
const D = dep.id; // demo data goes into the first department
const colleges = [["Atmiya University", "AU", 20], ["Marwadi University", "MU", 12], ["RK University", "RKU", 18],
  ["Government Engineering College, Rajkot", "GECR", 8], ["V.V.P. Engineering College", "VVP", 10]];
for (const [n, s, d] of colleges)
  await c.query(`INSERT INTO "College" ("DepartmentID","CollegeName","CollegeShortName","DistanceFromDU") VALUES ($4,$1,$2,$3) ON CONFLICT DO NOTHING`, [n, s, d, D]);
const fac = [["Dr. Arjun B. Patel", "Associate Professor", "Computer Engineering", "9876500001", "AU"],
  ["Prof. Kinjal M. Shah", "Assistant Professor", "Information Technology", "9876500002", "MU"],
  ["Dr. Hiren R. Joshi", "Professor", "Computer Engineering", "9876500003", "RKU"]];
for (const [n, d, dep, m, col] of fac)
  await c.query(`INSERT INTO "ExternalFaculty" ("DepartmentID","ExternalFacultyName","Designation","Department","MobileNumber","CollegeID")
    SELECT $6,$1,$2,$3,$4,"CollegeID" FROM "College" WHERE "CollegeShortName"=$5 AND "DepartmentID"=$6 ON CONFLICT DO NOTHING`, [n, d, dep, m, col, D]);
await c.query(`INSERT INTO "BankDetails" ("DepartmentID","NameAsPerBank","BankName","IFSCCode","BranchName","AccountNumber","ExternalFacultyID")
  SELECT $1,'PATEL ARJUN B','State Bank of India','SBIN0060123','Kalawad Road','30212345678',"ExternalFacultyID"
  FROM "ExternalFaculty" WHERE "MobileNumber"='9876500001' AND "DepartmentID"=$1 ON CONFLICT DO NOTHING`, [D]);
const courses = [["B.Tech + Hons Sem 5", "Btech-5"], ["B.Tech + Hons Sem 7", "Btech-7"], ["BCA/B.Sc.IT Sem 3", "BCA-3"]];
for (const [n, sn] of courses)
  await c.query(`INSERT INTO "Course" ("DepartmentID","CourseName","CourseShortName") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [D, n, sn]);
const subs = [["Btech-5", "2301CS512", "Advance Flutter", "AF"], ["Btech-5", "2301CS402", "Design and Analysis of Algorithms", "DAA"],
  ["Btech-5", "2301CS501", "Computer Networks", "CN"], ["Btech-7", "2101CS701", "Compiler Design", "CD"], ["BCA-3", "2304CS301", "Java Programming", "JAVA"]];
for (const [cs, code, name, sn] of subs)
  await c.query(`INSERT INTO "Subject" ("DepartmentID","CourseID","SubjectCode","SubjectName","SubjectShortName")
    SELECT $1,"CourseID",$3,$4,$5 FROM "Course" WHERE "DepartmentID"=$1 AND "CourseShortName"=$2 ON CONFLICT DO NOTHING`, [D, cs, code, name, sn]);
console.log("Demo data inserted");
await c.end();
