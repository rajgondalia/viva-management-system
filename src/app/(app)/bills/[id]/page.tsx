"use client";
import { useEffect, useState } from "react";
import { BillForm, type BillFormState } from "@/components/BillForm";
import { Empty, PageHeader } from "@/components/ui";
import { api } from "@/lib/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function EditBillPage({ params }: { params: { id: string } }) {
  const [init, setInit] = useState<{ form: BillFormState; billNo: string } | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api<any>(`/api/bills/${params.id}`).then((b) => setInit({
      billNo: b.billNo,
      form: {
        billDate: b.billDate, externalFacultyId: b.externalFacultyId, purpose: b.purpose, preApproval: b.preApproval, billDone: b.billDone,
        travelDate: b.travelDate, travelFrom: b.travelFrom, travelTo: b.travelTo, fuelTypeId: b.fuelTypeId, oneWayKm: b.oneWayKm,
        daDate: b.daDate,
        examItems: b.examItems.map((i: any) => ({ examDate: i.examDate, natureOfDuty: i.natureOfDuty, courseId: i.courseId, subjectId: i.subjectId, subjectCode: i.subjectCode,
          subjectName: i.subjectName, noOfStudents: i.noOfStudents })),
        miscDetails: b.miscDetails, miscAmount: b.miscAmount || "", miscRemarks: b.miscRemarks,
        advanceAmount: b.advanceAmount || "", remarks: b.remarks,
      },
    })).catch((e) => setErr(e.message));
  }, [params.id]);

  return (
    <div>
      <PageHeader title={`Edit Bill ${init?.billNo ?? ""}`} sub="Change any value - totals are recalculated on save" />
      {err ? <Empty text={err} /> : init ? <BillForm billId={Number(params.id)} initial={init.form} /> : <Empty text="Loading..." />}
    </div>
  );
}
