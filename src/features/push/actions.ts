"use server";

import { z } from "zod";
import { requireMember } from "@/shared/lib/member";
import { codeFromDbError, fail, ok, type Result } from "@/shared/lib/result";
import { sendPush, type SendOutcome } from "@/features/push/send";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { kstYmd } from "@/shared/lib/date";
import type { Json } from "@/shared/lib/database.types";

// 브라우저 PushSubscription.toJSON() 모양
const subscriptionJson = z.object({
  endpoint: z.url().max(2000),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }),
});

// 원문은 if_push_subscription 에 그대로 남기고(DB-09 외부 원문 표), 우리 표로 옮긴다.
export async function subscribePush(raw: unknown): Promise<Result> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  const { supabase, me } = auth;

  const { data: rawRow, error: rawError } = await supabase
    .from("if_push_subscription")
    .insert({ member_id: me.id, raw_json: (raw ?? null) as Json })
    .select("id")
    .single();
  if (rawError || !rawRow) return fail(codeFromDbError(rawError));

  const sub = subscriptionJson.safeParse(raw);
  if (!sub.success) return fail("INVALID_INPUT");

  // 같은 폰에서 다른 사람으로 로그인해 알림을 켜면, 그 폰 주소를 이 사람에게 넘긴다.
  // 남의 행이라 RLS 로는 못 바꾸니 비밀 키로 지운다. 주소(endpoint)는 그 폰 브라우저만 알아서 가로챌 수 없다.
  const { error: moveError } = await createAdminClient()
    .from("push_subscription")
    .delete()
    .eq("endpoint", sub.data.endpoint)
    .neq("member_id", me.id);
  if (moveError) return fail(codeFromDbError(moveError));

  const { error } = await supabase.from("push_subscription").upsert(
    {
      endpoint: sub.data.endpoint,
      member_id: me.id,
      p256dh: sub.data.keys.p256dh,
      auth_key: sub.data.keys.auth,
      is_active: true,
    },
    { onConflict: "endpoint" },
  );
  if (error) return fail(codeFromDbError(error));

  await supabase.from("if_push_subscription").update({ loaded_at: new Date().toISOString() }).eq("id", rawRow.id);
  return ok(undefined);
}

// 시험 알림: 지금 이 사람의 기기로 하나 보낸다. 같은 분에 두 번은 안 간다(발송 기록 열쇠에 분 단위 값).
export async function sendTestPush(): Promise<Result<SendOutcome>> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  const minuteKey = Math.floor(Date.now() / 60000);
  const outcome = await sendPush({
    kind: "test",
    refDate: kstYmd(),
    recipientId: auth.me.id,
    refId: minuteKey,
    title: "시험 알림",
    body: "알림이 잘 와요.",
    url: "/more",
  });
  return ok(outcome);
}
