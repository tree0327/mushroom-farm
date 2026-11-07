import { redirect } from "next/navigation";
import { PageBody, PageHeader } from "@/shared/components/page-header";
import { getMemberOrRedirect } from "@/shared/lib/member";
import { MemberManager } from "@/features/member/components/member-manager";

export default async function MembersPage() {
  const { supabase, me } = await getMemberOrRedirect();
  if (!me.isAdmin) redirect("/more");
  const { data, error } = await supabase.from("mf_member").select("id, email, is_admin").order("is_admin", { ascending: false }).order("email");
  if (error) throw error;
  return (
    <>
      <PageHeader title="계정" back="/more" />
      <PageBody>
        <MemberManager members={(data ?? []).map((m) => ({ id: Number(m.id), email: m.email, isAdmin: m.is_admin }))} />
      </PageBody>
    </>
  );
}
