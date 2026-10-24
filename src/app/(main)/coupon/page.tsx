import { PageBody, PageHeader } from "@/shared/components/page-header";
import { getMemberOrRedirect } from "@/shared/lib/member";
import { getCouponScreen } from "@/features/coupon/queries";
import { CouponBoard } from "@/features/coupon/components/coupon-board";

export default async function CouponPage() {
  const ctx = await getMemberOrRedirect();
  const { received, given, today } = await getCouponScreen(ctx);
  return (
    <>
      <PageHeader title="소원 쿠폰" />
      <PageBody>
        <CouponBoard received={received} given={given} today={today} partnerName={ctx.partner?.displayName ?? "상대"} />
      </PageBody>
    </>
  );
}
