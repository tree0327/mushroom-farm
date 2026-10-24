import { PageBody, PageHeader } from "@/shared/components/page-header";
import { getMemberOrRedirect } from "@/shared/lib/member";
import { getDiaryScreen } from "@/features/diary/queries";
import { MyToday, MyYesterday, PartnerYesterday } from "@/features/diary/components/diary-sections";

export default async function DiaryPage() {
  const ctx = await getMemberOrRedirect();
  const screen = await getDiaryScreen(ctx);
  const names = { me: ctx.me.displayName, partner: ctx.partner?.displayName ?? "상대" };

  return (
    <>
      <PageHeader title="일기" />
      <PageBody>
        <PartnerYesterday screen={screen} names={names} />
        <MyToday screen={screen} names={names} />
        <MyYesterday screen={screen} names={names} />
      </PageBody>
    </>
  );
}
