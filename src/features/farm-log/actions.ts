"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "@/shared/lib/member";
import { codeFromDbError, fail, okVoid, type Result } from "@/shared/lib/result";

const id = z.number().int().positive();
// 빈 칸(셋 다 null)도 보낸다 — DB 가 그 칸을 지운다. 종류·범위 검사는 DB 트리거(mf_value_check)가 항목 정의대로 한다.
const cellInput = z.object({
  fieldId: id,
  roomId: id.nullable(),
  num: z.number().finite().nullable(),
  optionId: id.nullable(),
  text: z.string().max(500).nullable(),
});
const dayInput = z.object({
  date: z.iso.date(),
  memo: z.string().max(1000),
  cells: z.array(cellInput).max(5000),
});
export type DayInput = z.input<typeof dayInput>;

// 하루를 한 번에 저장한다(DB mf_save_day — 한 트랜잭션).
export async function saveDay(input: DayInput): Promise<Result> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  const parsed = dayInput.safeParse(input);
  if (!parsed.success) return fail("LOG_INVALID");
  const d = parsed.data;

  const { error } = await auth.supabase.rpc("mf_save_day", {
    p_log_date: d.date,
    p_memo: d.memo,
    p_values: d.cells.map((c) => ({
      field_id: c.fieldId,
      room_id: c.roomId,
      num_value: c.num,
      option_id: c.optionId,
      text_value: c.text,
    })),
  });
  if (error) {
    if (error.code === "23514") return fail("LOG_INVALID");
    if (error.code === "23503") return fail("ROOM_GONE"); // 다른 기기에서 지운 호실·항목·보기
    return fail(codeFromDbError(error));
  }
  revalidatePath("/", "layout");
  return okVoid();
}

export async function deleteDay(date: string): Promise<Result> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  if (!z.iso.date().safeParse(date).success) return fail("INVALID_INPUT");
  const { error } = await auth.supabase.rpc("mf_delete_day", { p_log_date: date });
  if (error) return fail(codeFromDbError(error));
  revalidatePath("/", "layout");
  return okVoid();
}
