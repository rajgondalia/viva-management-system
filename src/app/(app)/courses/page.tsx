"use client";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { MasterPage, type MasterConfig } from "@/components/MasterPage";

const cfg: MasterConfig = {
  entity: "courses", title: "Courses", singular: "Course",
  sub: "Programs / semesters for which viva is taken, e.g. B.Tech + Hons Sem 5",
  searchKeys: ["name", "shortName"],
  fields: [
    { key: "name", label: "Course Name", required: true, full: true, placeholder: "B.Tech + Hons Sem 5" },
    { key: "shortName", label: "Short Name (Program-Sem in Excel)", placeholder: "Btech-5", full: true },
  ],
  columns: [
    { key: "name", label: "Course", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "shortName", label: "Short Name", render: (r) => r.shortName ? <span className="badge bg-slate-100 text-slate-700">{r.shortName}</span> : "-" },
    { key: "subjectCount", label: "Subjects", num: true },
  ],
  rowActions: (r) => (
    <Link href={`/subjects?q=${encodeURIComponent(r.name)}`} className="btn-ghost btn-sm" title="Subjects of this course" aria-label="Subjects"><BookOpen size={15} /></Link>
  ),
  importTemplate: [
    { CourseName: "B.Tech + Hons Sem 5", CourseShortName: "Btech-5" },
    { CourseName: "B.Tech + Hons Sem 7", CourseShortName: "Btech-7" },
    { CourseName: "BCA/B.Sc.IT Sem 3", CourseShortName: "BCA-3" },
  ],
  importNotes: ["Existing courses (same Course Name) are updated."],
  exportRow: (r) => ({ CourseName: r.name, CourseShortName: r.shortName }),
};

export default function Page() { return <MasterPage cfg={cfg} />; }
