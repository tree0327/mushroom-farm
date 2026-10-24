import { PageBody, PageHeader } from "@/shared/components/page-header";
import { getMemberOrRedirect } from "@/shared/lib/member";
import { getSalesRecords } from "@/features/sales/queries";
import { SalesScreen } from "@/features/sales/components/sales-screen";

export default async function SalesPage() {
  const ctx = await getMemberOrRedirect();
  const records = await getSalesRecords(ctx);
  return (
    <>
      <PageHeader title="매출관리" back="/more" />
      <PageBody>
        <SalesScreen records={records} />
      </PageBody>
    </>
  );
}
