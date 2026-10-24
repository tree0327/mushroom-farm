import { PageBody, PageHeader } from "@/shared/components/page-header";
import { getMemberOrRedirect } from "@/shared/lib/member";
import { PasswordForm } from "@/features/member/components/password-form";

export default async function PasswordPage() {
  await getMemberOrRedirect();
  return (
    <>
      <PageHeader title="비밀번호 바꾸기" back="/more" />
      <PageBody>
        <PasswordForm />
      </PageBody>
    </>
  );
}
