import { redirect } from "next/navigation";
import { PageBody, PageHeader } from "@/shared/components/page-header";
import { getMemberOrRedirect } from "@/shared/lib/member";
import { SCOPES } from "@/features/field/types";
import { FieldForm } from "@/features/field/components/field-form";

export default async function NewFieldPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const ctx = await getMemberOrRedirect();
  const { scope: raw } = await searchParams;
  const scope = SCOPES.find((s) => s.key === raw);
  if (!ctx.me.isAdmin || !scope) redirect("/more/fields");
  return (
    <>
      <PageHeader title={`${scope.label} 더하기`} back="/more/fields" />
      <PageBody>
        <FieldForm scope={scope.key} field={null} canEdit />
      </PageBody>
    </>
  );
}
