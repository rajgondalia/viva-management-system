"use client";
import { MasterPage, type MasterConfig } from "@/components/MasterPage";

const cfg: MasterConfig = {
  entity: "subjects", title: "Course-wise Subjects", singular: "Subject",
  sub: "Subjects of each course. Subject Short Name is printed on the bill PDF.",
  searchKeys: ["code", "name", "shortName", "courseName", "courseShortName"],
  fields: [
    { key: "courseId", label: "Course", type: "select", required: true, optionsFrom: "courses",
      placeholder: "Select course", optionLabel: (r) => r.name, optionSub: (r) => r.shortName },
    { key: "code", label: "Subject Code", required: true, upper: true, placeholder: "2301CS512" },
    { key: "shortName", label: "Subject Short Name (on PDF)", placeholder: "AF" },
    { key: "name", label: "Subject Name", required: true, full: true, placeholder: "Advance Flutter" },
  ],
  columns: [
    { key: "courseName", label: "Course", render: (r) => <span className="badge bg-slate-100 text-slate-700">{r.courseShortName || r.courseName}</span> },
    { key: "code", label: "Code", render: (r) => <span className="font-mono text-xs">{r.code}</span> },
    { key: "name", label: "Subject Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "shortName", label: "Short Name" },
  ],
  importTemplate: [
    { CourseName: "B.Tech + Hons Sem 5", SubjectCode: "2301CS512", SubjectName: "Advance Flutter", SubjectShortName: "AF" },
    { CourseName: "B.Tech + Hons Sem 5", SubjectCode: "2301CS402", SubjectName: "Design and Analysis of Algorithms", SubjectShortName: "DAA" },
  ],
  importNotes: ["CourseName (or Course Short Name) must already exist in Courses.", "Same course + Subject Code is updated."],
  exportRow: (r) => ({ CourseName: r.courseName, SubjectCode: r.code, SubjectName: r.name, SubjectShortName: r.shortName }),
};

export default function Page() { return <MasterPage cfg={cfg} />; }
