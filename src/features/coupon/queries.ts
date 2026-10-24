import "server-only";
import type { MemberContext } from "@/shared/lib/member";

export type CouponView = {
  id: number;
  title: string;
  body: string;
  expiresOn: string | null;
  status: "issued" | "used" | "done";
  isExpired: boolean; // 판정은 DB 트리거가 한다. 여기 값은 잠긴 모양을 그리는 데만 쓴다.
  createdAt: string;
};

export async function getCouponScreen({ supabase, me }: MemberContext) {
  const [{ data: rows }, { data: today }] = await Promise.all([
    supabase
      .from("wish_coupon")
      .select("id, giver_id, receiver_id, title, body, expires_on, status, created_at")
      .order("created_at", { ascending: false }),
    supabase.rpc("app_today"),
  ]);
  const t = today?.[0]?.today ?? "";
  const toView = (c: NonNullable<typeof rows>[number]): CouponView => ({
    id: c.id,
    title: c.title,
    body: c.body,
    expiresOn: c.expires_on,
    status: c.status,
    isExpired: c.status === "issued" && !!c.expires_on && c.expires_on < t,
    createdAt: c.created_at,
  });
  return {
    today: t,
    received: (rows ?? []).filter((c) => c.receiver_id === me.id).map(toView),
    given: (rows ?? []).filter((c) => c.giver_id === me.id).map(toView),
  };
}
