"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "@/shared/lib/member";
import { codeFromDbError, fail, okVoid, type Result } from "@/shared/lib/result";
import { withSubject } from "@/shared/lib/korean";
import { sendPush } from "@/features/push/send";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// 일기 저장(처음이면 넣고, 있으면 고친다). entryDate 는 화면이 쓰던 날짜 — 자정을 넘겨 누르면 DB 판정이 막는다.
export async function saveDiary(entryDate: string, body: string): Promise<Result> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  const { supabase, me, partner } = auth;

  const date = ymd.safeParse(entryDate);
  const text = body.trim();
  if (!date.success) return fail("INVALID_INPUT");
  if (!text) return fail("DIARY_EMPTY");
  if (text.length > 5000) return fail("INVALID_INPUT");

  const [{ data: flags }, { data: today }] = await Promise.all([
    supabase.rpc("diary_flags", { p_entry_date: date.data }),
    supabase.rpc("app_today"),
  ]);
  const f = flags?.[0];
  if (!f || !today?.[0]) return fail("UNKNOWN");
  if (f.is_rest) return fail("DIARY_REST_DAY");
  if (!f.can_write) return fail(date.data < today[0].today ? "DIARY_CLOSED" : "DIARY_NOT_TODAY");

  const { data: existing } = await supabase
    .from("diary_entry")
    .select("id")
    .eq("entry_date", date.data)
    .eq("member_id", me.id)
    .maybeSingle();

  let entryId: number;
  let isFirst = false;
  if (existing) {
    const { error } = await supabase.from("diary_entry").update({ body: text }).eq("id", existing.id);
    if (error) return fail(codeFromDbError(error));
    entryId = existing.id;
  } else {
    const { data: inserted, error } = await supabase
      .from("diary_entry")
      .insert({ entry_date: date.data, member_id: me.id, body: text })
      .select("id")
      .single();
    if (error?.code === "23505") {
      // 두 번 누름 — 먼저 들어간 행을 고친다
      const { error: e2 } = await supabase
        .from("diary_entry")
        .update({ body: text })
        .eq("entry_date", date.data)
        .eq("member_id", me.id);
      if (e2) return fail(codeFromDbError(e2));
      revalidatePath("/diary");
      return okVoid();
    }
    if (error || !inserted) return fail(codeFromDbError(error));
    entryId = inserted.id;
    isFirst = true;
  }

  revalidatePath("/diary");
  if (isFirst && partner) {
    after(() =>
      sendPush({
        kind: "diary_written",
        refDate: date.data,
        recipientId: partner.id,
        refId: entryId,
        title: "오늘 일기 도착",
        body: `${withSubject(me.displayName)} 오늘 일기를 썼어요. 내일 아침 9시에 열려요.`,
        url: "/diary",
      }),
    );
  }
  return okVoid();
}

// 상대의 어제 일기에 답장(처음이면 넣고, 있으면 고친다).
export async function saveReply(diaryEntryId: number, body: string): Promise<Result> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  const { supabase, me, partner } = auth;

  const id = z.number().int().positive().safeParse(diaryEntryId);
  const text = body.trim();
  if (!id.success) return fail("INVALID_INPUT");
  if (!text) return fail("REPLY_EMPTY");
  if (text.length > 2000) return fail("INVALID_INPUT");

  // RLS: 공개 전 상대 일기는 안 보인다 → 없음과 같다
  const { data: entry } = await supabase
    .from("diary_entry")
    .select("id, entry_date, member_id")
    .eq("id", id.data)
    .maybeSingle();
  if (!entry) return fail("REPLY_NO_DIARY");
  if (entry.member_id === me.id) return fail("FORBIDDEN");

  const { data: flags } = await supabase.rpc("diary_flags", { p_entry_date: entry.entry_date });
  const f = flags?.[0];
  if (!f) return fail("UNKNOWN");
  if (!f.is_revealed) return fail("REPLY_NOT_OPEN");
  if (!f.can_reply) return fail("REPLY_CLOSED");

  const { data: existing } = await supabase.from("diary_reply").select("id").eq("diary_entry_id", entry.id).maybeSingle();
  let isFirst = false;
  if (existing) {
    const { error } = await supabase.from("diary_reply").update({ body: text }).eq("id", existing.id);
    if (error) return fail(codeFromDbError(error));
  } else {
    const { error } = await supabase.from("diary_reply").insert({ diary_entry_id: entry.id, member_id: me.id, body: text });
    if (error?.code === "23505") {
      const { error: e2 } = await supabase.from("diary_reply").update({ body: text }).eq("diary_entry_id", entry.id);
      if (e2) return fail(codeFromDbError(e2));
    } else if (error) {
      return fail(codeFromDbError(error));
    } else {
      isFirst = true;
    }
  }

  revalidatePath("/diary");
  if (isFirst && partner) {
    after(() =>
      sendPush({
        kind: "reply_written",
        refDate: entry.entry_date,
        recipientId: partner.id,
        refId: entry.id,
        title: "답장이 왔어요",
        body: `${withSubject(me.displayName)} 어제 일기에 답장을 남겼어요.`,
        url: "/diary",
      }),
    );
  }
  return okVoid();
}
