"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "@/shared/lib/member";
import { codeFromDbError, fail, okVoid, type Result } from "@/shared/lib/result";

// 화면에서 빈칸은 null 로 온다(0 과 다르다). 범위는 DB CHECK 와 같다.
const count = z.number().int().min(0).max(10_000_000).nullable();
const kg = z.number().min(0).max(999_999.9).nullable();
const dayInput = z.object({
  date: z.iso.date(),
  bottled: count,
  inoculated: count,
  contaminated: count,
  memo: z.string().max(1000),
  rooms: z
    .array(
      z.object({
        roomId: z.number().int().positive(),
        good: kg,
        defect: kg,
        temperature: z.number().min(-20).max(60).nullable(),
        humidity: z.number().int().min(0).max(100).nullable(),
      }),
    )
    .max(100),
});
export type DayInput = z.input<typeof dayInput>;

const oneDecimal = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

// 하루를 한 번에 저장한다(DB save_day — 칸이 모두 빈 행은 지운다).
export async function saveDay(input: DayInput): Promise<Result> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  const parsed = dayInput.safeParse(input);
  if (!parsed.success) return fail("LOG_INVALID");
  const d = parsed.data;

  const { error } = await auth.supabase.rpc("save_day", {
    p_log_date: d.date,
    p_bottled_count: d.bottled,
    p_inoculated_count: d.inoculated,
    p_contaminated_count: d.contaminated,
    p_memo: d.memo,
    p_rooms: d.rooms.map((r) => ({
      room_id: r.roomId,
      good_kg: oneDecimal(r.good),
      defect_kg: oneDecimal(r.defect),
      temperature_c: oneDecimal(r.temperature),
      humidity_pct: r.humidity,
    })),
  });
  if (error) {
    if (error.code === "23514") return fail("LOG_INVALID");
    if (error.code === "23503") return fail("ROOM_GONE"); // 다른 기기에서 지운 호실
    return fail(codeFromDbError(error));
  }
  revalidatePath("/", "layout");
  return okVoid();
}

export async function deleteDay(date: string): Promise<Result> {
  const auth = await requireMember();
  if (!auth.ok) return auth;
  if (!z.iso.date().safeParse(date).success) return fail("INVALID_INPUT");
  const { error } = await auth.supabase.rpc("delete_day", { p_log_date: date });
  if (error) return fail(codeFromDbError(error));
  revalidatePath("/", "layout");
  return okVoid();
}
