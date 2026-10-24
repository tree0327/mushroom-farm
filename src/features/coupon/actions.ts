"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "@/shared/lib/member";
import { codeFromDbError, fail, okVoid, type Result } from "@/shared/lib/result";
import { withSubject } from "@/shared/lib/korean";
import { kstYmd } from "@/shared/lib/date";
import { sendPush } from "@/features/push/send";

const couponInput = z.object({
  title: z.string().trim().min(1).max(50),
  body: z.string().trim().max(500),
  expiresOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});

export async function createCoupon(title: string, body: string, expiresOn: string | null): Promise<Result> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  const { supabase, me, partner } = auth;
  if (!partner) return fail("FORBIDDEN");

  const input = couponInput.safeParse({ title, body, expiresOn: expiresOn || null });
  if (!input.success) return fail("INVALID_INPUT");

  const { data, error } = await supabase
    .from("wish_coupon")
    .insert({
      giver_id: me.id,
      receiver_id: partner.id,
      title: input.data.title,
      body: input.data.body,
      expires_on: input.data.expiresOn,
    })
    .select("id, created_at")
    .single();
  if (error || !data) return fail(codeFromDbError(error));

  revalidatePath("/coupon");
  after(() =>
    sendPush({
      kind: "coupon_issued",
      refDate: kstYmd(new Date(data.created_at)),
      recipientId: partner.id,
      refId: data.id,
      title: "소원 쿠폰이 왔어요",
      body: `${withSubject(me.displayName)} 「${input.data.title}」 쿠폰을 줬어요.`,
      url: "/coupon",
    }),
  );
  return okVoid();
}

// 상태 바꾸기: 받은 사람이 used, 준 사람이 done. 누가·언제 되는지는 DB 트리거가 판정한다.
async function changeStatus(couponId: number, to: "used" | "done"): Promise<Result> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  const { supabase, me } = auth;
  const id = z.number().int().positive().safeParse(couponId);
  if (!id.success) return fail("INVALID_INPUT");

  const from = to === "used" ? "issued" : "used";
  const { data, error } = await supabase
    .from("wish_coupon")
    .update({ status: to })
    .eq("id", id.data)
    .eq("status", from) // 두 번 누름: 두 번째는 0행
    .select("id, title, giver_id, receiver_id")
    .maybeSingle();
  if (error) return fail(codeFromDbError(error));
  if (!data) return fail("COUPON_ALREADY_CHANGED");

  revalidatePath("/coupon");
  const recipientId = to === "used" ? data.giver_id : data.receiver_id;
  after(() =>
    sendPush({
      kind: to === "used" ? "coupon_used" : "coupon_done",
      refDate: kstYmd(),
      recipientId,
      refId: data.id,
      title: to === "used" ? "쿠폰을 썼어요" : "소원을 들어줬어요",
      body:
        to === "used"
          ? `${withSubject(me.displayName)} 「${data.title}」 쿠폰을 썼어요. 들어주면 [들어줬어요]를 눌러 주세요.`
          : `${withSubject(me.displayName)} 「${data.title}」 소원을 들어줬어요.`,
      url: "/coupon",
    }),
  );
  return okVoid();
}

export async function redeemCoupon(couponId: number): Promise<Result> {
  return changeStatus(couponId, "used");
}

export async function completeCoupon(couponId: number): Promise<Result> {
  return changeStatus(couponId, "done");
}
