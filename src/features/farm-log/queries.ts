import "server-only";
import type { MemberContext } from "@/shared/lib/member";
import type { DayRow, RoomTotal } from "@/features/analysis/stats";

export type Room = { id: number; name: string; sortOrder: number; isActive: boolean };

// 하루 기록 화면 값. 칸이 비면 null(안 적음).
export type DayEntry = {
  bottled: number | null;
  inoculated: number | null;
  contaminated: number | null;
  memo: string;
  rooms: Record<number, { good: number | null; defect: number | null; temperature: number | null; humidity: number | null }>;
};

// Data API 는 numeric·bigint 를 숫자나 글자로 줄 수 있다 — 숫자로 맞춘다.
const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export async function getRooms({ supabase }: MemberContext): Promise<Room[]> {
  const { data, error } = await supabase
    .from("mf_room")
    .select("id, name, sort_order, is_active")
    .order("sort_order")
    .order("id");
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: Number(r.id), name: r.name, sortOrder: r.sort_order, isActive: r.is_active }));
}

export async function getDay({ supabase }: MemberContext, date: string): Promise<DayEntry> {
  const [daily, rooms] = await Promise.all([
    supabase
      .from("mf_daily_log")
      .select("bottled_count, inoculated_count, contaminated_count, memo")
      .eq("log_date", date)
      .maybeSingle(),
    supabase.from("mf_room_log").select("room_id, good_kg, defect_kg, temperature_c, humidity_pct").eq("log_date", date),
  ]);
  if (daily.error) throw daily.error;
  if (rooms.error) throw rooms.error;
  return {
    bottled: num(daily.data?.bottled_count),
    inoculated: num(daily.data?.inoculated_count),
    contaminated: num(daily.data?.contaminated_count),
    memo: daily.data?.memo ?? "",
    rooms: Object.fromEntries(
      (rooms.data ?? []).map((r) => [
        Number(r.room_id),
        { good: num(r.good_kg), defect: num(r.defect_kg), temperature: num(r.temperature_c), humidity: num(r.humidity_pct) },
      ]),
    ),
  };
}

export type FarmDay = DayRow & { hasMemo: boolean };

export async function getFarmDays({ supabase }: MemberContext, from: string, to: string): Promise<FarmDay[]> {
  const { data, error } = await supabase.rpc("mf_farm_days", { p_from: from, p_to: to });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    date: r.log_date,
    bottled: num(r.bottled_count),
    inoculated: num(r.inoculated_count),
    contaminated: num(r.contaminated_count),
    good: num(r.good_kg),
    defect: num(r.defect_kg),
    hasMemo: r.has_memo,
  }));
}

export async function getRoomTotals({ supabase }: MemberContext, from: string, to: string): Promise<RoomTotal[]> {
  const { data, error } = await supabase.rpc("mf_room_totals", { p_from: from, p_to: to });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    roomId: Number(r.room_id),
    name: r.name,
    isActive: r.is_active,
    good: num(r.good_kg),
    defect: num(r.defect_kg),
  }));
}
