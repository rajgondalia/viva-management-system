import { BillForm } from "@/components/BillForm";
import { PageHeader } from "@/components/ui";

export default function NewBillPage() {
  return (
    <div>
      <PageHeader title="Create New Bill" sub="Bill for Reimbursement of Allowances / Honorarium - amounts are calculated automatically" />
      <BillForm />
    </div>
  );
}
