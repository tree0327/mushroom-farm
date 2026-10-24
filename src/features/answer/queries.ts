import "server-only";
import type { MemberContext } from "@/shared/lib/member";

export type DrawView = {
  id: number;
  worry: string;
  phrase: string;
  isShared: boolean;
  isMine: boolean;
  ownerName: string;
  createdAt: string;
};

// RLS: 내 기록 전부 + 상대가 공유한 기록만 돌아온다. 최근 50개.
export async function getAnswerScreen({ supabase, me, partner }: MemberContext) {
  const [{ data: draws }, { count: phraseCount }, { count: ourCount }] = await Promise.all([
    supabase
      .from("answer_draw")
      .select("id, member_id, worry, is_shared, created_at, phrase_id")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("answer_phrase").select("id", { count: "exact", head: true }),
    supabase.from("answer_phrase").select("id", { count: "exact", head: true }).eq("is_default", false),
  ]);

  const phraseIds = [...new Set((draws ?? []).map((d) => d.phrase_id))];
  const { data: phrases } = phraseIds.length
    ? await supabase.from("answer_phrase").select("id, body").in("id", phraseIds)
    : { data: [] };
  const phraseById = new Map((phrases ?? []).map((p) => [p.id, p.body]));

  const list: DrawView[] = (draws ?? []).map((d) => ({
    id: d.id,
    worry: d.worry,
    phrase: phraseById.get(d.phrase_id) ?? "",
    isShared: d.is_shared,
    isMine: d.member_id === me.id,
    ownerName: d.member_id === me.id ? me.displayName : (partner?.displayName ?? "상대"),
    createdAt: d.created_at,
  }));

  return { draws: list, phraseCount: phraseCount ?? 0, ourPhraseCount: ourCount ?? 0 };
}
