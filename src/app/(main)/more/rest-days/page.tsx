import { PageBody, PageHeader } from "@/shared/components/page-header";
import { redirect } from "next/navigation";
import { getMemberOrRedirect } from "@/shared/lib/member";
import { RestDayManager } from "@/features/rest-day/components/rest-day-manager";

export default async function RestDaysPage() {
  const { supabase, me } = await getMemberOrRedirect();
  if (!me.isAdmin) redirect("/more"); // 쉬는 날 화면은 관리자만(R8)
  const { data: today } = await supabase.rpc("app_today");
  const t = today?.[0];
  if (!t) throw new Error("app_today failed");
  const { data: days } = await supabase
    .from("rest_day")
    .select("id, rest_date, memo")
    .gte("rest_date", t.today)
    .order("rest_date");

  return (
    <>
      <PageHeader title="쉬는 날" back="/more" />
      <PageBody>
        <RestDayManager
          isAdmin={me.isAdmin}
          isWeekendRest={t.is_weekend_rest}
          today={t.today}
          restDays={(days ?? []).map((d) => ({ id: d.id, date: d.rest_date, memo: d.memo }))}
        />
      </PageBody>
    </>
  );
}
