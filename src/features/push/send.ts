import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import type { PushKind } from "@/shared/lib/database.types";

export type PushMessage = {
  kind: PushKind;
  refDate: string; // 한국 날짜 YYYY-MM-DD — 중복 막는 열쇠의 일부
  recipientId: number;
  refId?: number | null; // 알림 대상 id. 없으면 null
  title: string;
  body: string;
  url: string; // 알림을 누르면 열 화면
};

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export type SendOutcome = "sent" | "failed" | "no_subscription" | "duplicate";

// 한 사람에게 알림 하나. push_log 고유키(종류·날짜·받는 사람·대상)를 먼저 차지한 호출만 보낸다.
// 그래서 예약 작업이 두 번 돌거나 저장 버튼을 두 번 눌러도 알림은 한 번이다.
// 실패해도 예외를 던지지 않는다 — 알림 때문에 저장이 실패하면 안 된다.
// ponytail: 일시 실패(애플 서버 5xx)도 열쇠를 차지한 채 끝나 다시 보내지 않는다. 키우려면 result='failed' 행을
// 예약 작업에서 다시 집어 보내는 단계를 더한다.
export async function sendPush(msg: PushMessage): Promise<SendOutcome> {
  const db = createAdminClient();

  const { data: claimed, error: claimError } = await db
    .from("mf_push_log")
    .upsert(
      { kind: msg.kind, ref_date: msg.refDate, recipient_id: msg.recipientId, ref_id: msg.refId ?? null },
      { onConflict: "kind,ref_date,recipient_id,ref_id", ignoreDuplicates: true },
    )
    .select("id");
  if (claimError) {
    console.error("push_log claim failed", claimError);
    return "failed";
  }
  if (!claimed || claimed.length === 0) return "duplicate";
  const logId = claimed[0].id;

  const { data: subs } = await db
    .from("mf_push_subscription")
    .select("id, endpoint, p256dh, auth_key")
    .eq("member_id", msg.recipientId)
    .eq("is_active", true);

  if (!subs || subs.length === 0) {
    await db.from("mf_push_log").update({ result: "no_subscription" }).eq("id", logId);
    return "no_subscription";
  }

  configure();
  const payload = JSON.stringify({ title: msg.title, body: msg.body, url: msg.url, tag: `${msg.kind}-${msg.refDate}-${msg.refId ?? 0}` });
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } }, payload, {
          TTL: 60 * 60 * 12,
        });
        sent += 1;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // 404·410 = 구독이 사라짐(앱 삭제·알림 끔). 다음부터 보내지 않는다.
        if (status === 404 || status === 410) {
          await db.from("mf_push_subscription").update({ is_active: false }).eq("id", s.id);
        } else {
          console.error("push send failed", status, e);
        }
      }
    }),
  );

  const result = sent > 0 ? "sent" : "failed";
  await db.from("mf_push_log").update({ result, sent_count: sent }).eq("id", logId);
  return result;
}
