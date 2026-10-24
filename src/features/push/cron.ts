import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { addDays } from "@/shared/lib/date";
import { withSubject } from "@/shared/lib/korean";
import { sendPush, type SendOutcome } from "@/features/push/send";

// 예약 알림. Supabase Cron(pg_cron + pg_net)이 `Authorization: Bearer <CRON_SECRET>` 으로 부른다.
// 공개·마감 판정은 DB 가 한다. 여기서는 알림만 보낸다 — 늦게 돌거나 두 번 돌아도 push_log 고유키로 한 번만 간다.

export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get("authorization") ?? "";
  // 길이가 달라도 시간이 같도록 해시끼리 비교한다.
  const a = createHash("sha256").update(got).digest();
  const b = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(a, b);
}

type JobResult = { today: string; skipped?: string; sent: { recipientId: number; outcome: SendOutcome }[] };

async function loadToday(db: ReturnType<typeof createAdminClient>) {
  const { data, error } = await db.rpc("app_today");
  if (error || !data?.[0]) throw error ?? new Error("app_today returned nothing");
  return data[0];
}

// 21시: 오늘 일기를 안 쓴 사람에게. 쉬는 날이면 보내지 않는다.
export async function runEvening(): Promise<JobResult> {
  const db = createAdminClient();
  const t = await loadToday(db);
  if (t.is_rest) return { today: t.today, skipped: "rest_day", sent: [] };

  const [{ data: members, error: mErr }, { data: written, error: wErr }] = await Promise.all([
    db.from("member").select("id"),
    db.from("diary_entry").select("member_id").eq("entry_date", t.today),
  ]);
  if (mErr || wErr) throw mErr ?? wErr;

  const done = new Set((written ?? []).map((w) => w.member_id));
  const targets = (members ?? []).filter((m) => !done.has(m.id));
  const sent = await Promise.all(
    targets.map(async (m) => ({
      recipientId: m.id,
      outcome: await sendPush({
        kind: "evening_reminder",
        refDate: t.today,
        recipientId: m.id,
        title: "오늘 일기를 써 주세요",
        body: "자정까지 쓸 수 있어요. 내일 아침 9시에 서로 열려요.",
        url: "/diary",
      }),
    })),
  );
  return { today: t.today, sent };
}

// 9시: 어제 일기마다 상대에게 「답장해 주세요」. 쉬는 날에도 보낸다(금요일 일기 → 토요일 9시).
export async function runMorning(): Promise<JobResult> {
  const db = createAdminClient();
  const t = await loadToday(db);
  const yesterday = addDays(t.today, -1);

  const [{ data: members, error: mErr }, { data: entries, error: eErr }] = await Promise.all([
    db.from("member").select("id, display_name"),
    db.from("diary_entry").select("id, member_id").eq("entry_date", yesterday),
  ]);
  if (mErr || eErr) throw mErr ?? eErr;

  const all = members ?? [];
  const sent = await Promise.all(
    (entries ?? []).flatMap((e) => {
      const writer = all.find((m) => m.id === e.member_id);
      const partner = all.find((m) => m.id !== e.member_id);
      if (!writer || !partner) return [];
      return [
        sendPush({
          kind: "morning_reply",
          refDate: t.today,
          recipientId: partner.id,
          refId: e.id,
          title: "어제 일기가 열렸어요",
          body: `${withSubject(writer.display_name)} 쓴 어제 일기에 답장해 주세요. 오늘 자정까지 쓸 수 있어요.`,
          url: "/diary",
        }).then((outcome) => ({ recipientId: partner.id, outcome })),
      ];
    }),
  );
  return { today: t.today, sent };
}
