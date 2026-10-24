import "server-only";
import { addDays } from "@/shared/lib/date";
import type { MemberContext } from "@/shared/lib/member";

export type DiaryView = { id: number; body: string; updatedAt: string };
export type ReplyView = { id: number; body: string; updatedAt: string };

// 어제 칸의 상태 — 화면은 이 값만 보고 그린다(판정은 DB).
export type YesterdayState =
  | { kind: "locked"; reason: "REPLY_NOT_OPEN" } // 9시 전
  | { kind: "none"; restDay: boolean } // 상대가 안 씀(쉬는 날이었거나)
  | { kind: "open"; entry: DiaryView; reply: ReplyView | null; canReply: boolean };

export type DiaryScreen = {
  today: string;
  yesterday: string;
  todayIsRest: boolean;
  canWriteToday: boolean;
  myToday: DiaryView | null;
  partnerWroteToday: boolean;
  partnerYesterday: YesterdayState; // 상대의 어제 일기 + 내 답장
  myYesterday: YesterdayState; // 내 어제 일기 + 상대 답장
};

export async function getDiaryScreen({ supabase, me, partner }: MemberContext): Promise<DiaryScreen> {
  const { data: todayRows, error } = await supabase.rpc("app_today");
  if (error || !todayRows?.[0]) throw new Error(`app_today failed: ${error?.message}`);
  const today = todayRows[0].today;
  const yesterday = addDays(today, -1);

  const [flagsToday, flagsYesterday, writers, entries] = await Promise.all([
    supabase.rpc("diary_flags", { p_entry_date: today }),
    supabase.rpc("diary_flags", { p_entry_date: yesterday }),
    supabase.rpc("diary_writers", { p_entry_date: today }),
    // RLS: 내 일기 전부 + 공개된 상대 일기만 돌아온다
    supabase
      .from("diary_entry")
      .select("id, entry_date, member_id, body, updated_at")
      .in("entry_date", [today, yesterday]),
  ]);
  const yesterdayIds = (entries.data ?? []).filter((e) => e.entry_date === yesterday).map((e) => e.id);
  const { data: replies } = yesterdayIds.length
    ? await supabase.from("diary_reply").select("id, diary_entry_id, body, updated_at").in("diary_entry_id", yesterdayIds)
    : { data: [] };
  const ft = flagsToday.data?.[0];
  const fy = flagsYesterday.data?.[0];
  if (!ft || !fy) throw new Error("diary_flags failed");

  const find = (date: string, memberId: number | undefined) =>
    (entries.data ?? []).find((e) => e.entry_date === date && Number(e.member_id) === memberId);

  const toView = (e: { id: number; body: string; updated_at: string }): DiaryView => ({
    id: Number(e.id),
    body: e.body,
    updatedAt: e.updated_at,
  });

  // 상대 어제 일기는 9시 전에 잠긴다. 내 어제 일기는 늘 보이고, 답장은 9시 뒤에야 생길 수 있다.
  const yesterdayOf = (memberId: number | undefined, isMine: boolean): YesterdayState => {
    if (!isMine && !fy.is_revealed) return { kind: "locked", reason: "REPLY_NOT_OPEN" };
    const e = find(yesterday, memberId);
    if (!e) return { kind: "none", restDay: fy.is_rest };
    const r = (replies ?? []).find((x) => x.diary_entry_id === e.id);
    return { kind: "open", entry: toView(e), reply: r ? toView(r) : null, canReply: !isMine && fy.can_reply };
  };

  const mine = find(today, me.id);
  return {
    today,
    yesterday,
    todayIsRest: ft.is_rest,
    canWriteToday: ft.can_write,
    myToday: mine ? toView(mine) : null,
    partnerWroteToday: (writers.data ?? []).some((w) => Number(w.member_id) === partner?.id),
    partnerYesterday: yesterdayOf(partner?.id, false),
    myYesterday: yesterdayOf(me.id, true),
  };
}
