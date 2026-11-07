import "server-only";
import { z } from "zod";
import type { MemberContext } from "@/shared/lib/member";
import { num } from "@/shared/lib/db-value";
import { cellKey, type DayEntry, type FarmDay, type RoomTotalRow } from "@/features/farm-log/types";

export async function getDay({ supabase }: MemberContext, date: string): Promise<DayEntry> {
  const [day, values] = await Promise.all([
    supabase.from("mf_day").select("memo").eq("log_date", date).maybeSingle(),
    supabase.from("mf_value").select("field_id, room_id, num_value, option_id, text_value").eq("log_date", date),
  ]);
  if (day.error) throw day.error;
  if (values.error) throw values.error;
  return {
    memo: day.data?.memo ?? "",
    cells: Object.fromEntries(
      values.data.map((v) => [
        cellKey(Number(v.field_id), v.room_id === null ? null : Number(v.room_id)),
        { num: num(v.num_value), optionId: num(v.option_id), text: v.text_value },
      ]),
    ),
  };
}

// mf_farm_days.totals(jsonb) 모양. DB 가 만든 값이지만 Json 타입이라 여기서 좁힌다.
const numeric = z.union([z.number(), z.string()]).transform(Number);
const totalsShape = z.record(
  z.string(),
  z.object({
    sum: numeric.optional(),
    min: numeric.optional(),
    max: numeric.optional(),
    n: numeric,
    opts: z.record(z.string(), numeric).optional(),
  }),
);

export async function getFarmDays({ supabase }: MemberContext, from: string, to: string): Promise<FarmDay[]> {
  const { data, error } = await supabase.rpc("mf_farm_days", { p_from: from, p_to: to });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    date: r.log_date,
    hasMemo: r.has_memo,
    totals: Object.fromEntries(
      Object.entries(totalsShape.parse(r.totals)).map(([id, t]) => [
        Number(id),
        {
          sum: t.sum ?? null,
          min: t.min ?? null,
          max: t.max ?? null,
          n: t.n,
          opts: Object.fromEntries(Object.entries(t.opts ?? {}).map(([o, c]) => [Number(o), c])),
        },
      ]),
    ),
  }));
}

export async function getRoomTotals({ supabase }: MemberContext, from: string, to: string): Promise<RoomTotalRow[]> {
  const { data, error } = await supabase.rpc("mf_room_totals", { p_from: from, p_to: to });
  if (error) throw error;
  return (data ?? []).map((r) => ({ roomId: Number(r.room_id), fieldId: Number(r.field_id), sum: Number(r.sum_value), n: Number(r.value_count) }));
}
