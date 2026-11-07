import { PageBody, PageHeader } from "@/shared/components/page-header";
import { getMemberOrRedirect } from "@/shared/lib/member";
import { getFields } from "@/features/field/queries";
import { FieldList } from "@/features/field/components/field-list";

export default async function FieldsPage() {
  const ctx = await getMemberOrRedirect();
  const fields = await getFields(ctx);
  return (
    <>
      <PageHeader title="입력 항목" back="/more" />
      <PageBody>
        <FieldList fields={fields} canEdit={ctx.me.isAdmin} />
      </PageBody>
    </>
  );
}
