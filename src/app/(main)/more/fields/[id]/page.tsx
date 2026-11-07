import { notFound } from "next/navigation";
import { PageBody, PageHeader } from "@/shared/components/page-header";
import { getMemberOrRedirect } from "@/shared/lib/member";
import { getFields } from "@/features/field/queries";
import { FieldForm } from "@/features/field/components/field-form";
import { OptionEditor } from "@/features/field/components/option-editor";

export default async function FieldPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getMemberOrRedirect();
  const { id } = await params;
  const field = (await getFields(ctx)).find((f) => String(f.id) === id);
  if (!field) notFound();
  return (
    <>
      <PageHeader title={field.name} back="/more/fields" />
      <PageBody>
        <FieldForm key={field.id} scope={field.scope} field={field} canEdit={ctx.me.isAdmin} />
        {field.valueType === "choice" && <OptionEditor fieldId={field.id} options={field.options} canEdit={ctx.me.isAdmin} />}
      </PageBody>
    </>
  );
}
