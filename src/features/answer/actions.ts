"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "@/shared/lib/member";
import { codeFromDbError, fail, ok, okVoid, type Result } from "@/shared/lib/result";

export type DrawResult = { drawId: number; body: string; authorName: string | null };

// 펼치기: DB 함수가 무작위 문구 하나를 고르고 기록을 남긴다.
export async function drawAnswer(worry: string): Promise<Result<DrawResult>> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  const { supabase, me, partner } = auth;

  const text = z.string().trim().max(200).safeParse(worry);
  if (!text.success) return fail("INVALID_INPUT");

  const { data, error } = await supabase.rpc("draw_answer", { p_worry: text.data });
  if (error || !data?.[0]) return fail(codeFromDbError(error));
  const r = data[0];
  const author = r.is_default ? null : [me, partner].find((m) => m?.userId === r.author_id)?.displayName ?? null;

  revalidatePath("/answer");
  return ok({ drawId: Number(r.draw_id), body: r.body, authorName: author });
}

export async function setDrawShared(drawId: number, isShared: boolean): Promise<Result> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  const id = z.number().int().positive().safeParse(drawId);
  if (!id.success) return fail("INVALID_INPUT");
  // RLS: 내 기록만 바뀐다. 남의 것이면 0행.
  const { data, error } = await auth.supabase
    .from("answer_draw")
    .update({ is_shared: isShared })
    .eq("id", id.data)
    .eq("member_id", auth.me.id)
    .select("id");
  if (error) return fail(codeFromDbError(error));
  if (!data?.length) return fail("FORBIDDEN");
  revalidatePath("/answer");
  return okVoid();
}

export async function addPhrase(body: string): Promise<Result> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  const text = body.trim();
  if (!text) return fail("PHRASE_EMPTY");
  if (text.length > 200) return fail("INVALID_INPUT");
  const { error } = await auth.supabase.from("answer_phrase").insert({ body: text, is_default: false });
  if (error) return fail(codeFromDbError(error));
  revalidatePath("/answer");
  return okVoid();
}
