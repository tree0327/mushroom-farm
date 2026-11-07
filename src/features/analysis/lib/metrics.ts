// 기본 지표 — 역할(role)이 붙은 기본 항목 합계로 계산한다. 화면은 이 결과만 그린다.
import type { FieldRole } from "@/features/field/types";
import type { FarmDay, RoomTotalRow } from "@/features/farm-log/types";

// 하루 기본 항목 합계. null = 그날 그 항목을 안 적음.
export type DayRow = {
  date: string;
  bottled: number | null;
  inoculated: number | null;
  contaminated: number | null;
  good: number | null; // 정품 kg (호실 합)
  defect: number | null; // 불량 kg (호실 합)
};

export type RoleIds = Partial<Record<FieldRole, number>>;

// DB 하루 합계(항목 id 별) → 기본 지표용 한 줄
export function toDayRow(day: FarmDay, roles: RoleIds): DayRow {
  const pick = (role: FieldRole) => {
    const id = roles[role];
    return id === undefined ? null : (day.totals[id]?.sum ?? null);
  };
  return {
    date: day.date,
    bottled: pick("bottled"),
    inoculated: pick("inoculated"),
    contaminated: pick("contaminated"),
    good: pick("good"),
    defect: pick("defect"),
  };
}

const sum = (rows: DayRow[], key: keyof Omit<DayRow, "date">): number | null =>
  rows.some((r) => r[key] !== null) ? rows.reduce((s, r) => s + (r[key] ?? 0), 0) : null;
const ratio = (num: number | null, den: number | null): number | null =>
  num === null || den === null || den === 0 ? null : num / den;
const round1 = (n: number) => Math.round(n * 10) / 10;

export type Summary = {
  bottled: number | null;
  inoculated: number | null;
  contaminated: number | null;
  good: number | null;
  defect: number | null;
  harvest: number | null; // 정품 + 불량 kg
  defectRate: number | null; // 불량 kg ÷ 전체 kg (0~1)
  contaminationRate: number | null; // 오염 병 ÷ 접종 병 (0~1)
  gramsPerBottle: number | null; // 전체 수확 g ÷ 입병 병 — 어림(입병한 병이 그 기간에 수확되지 않으므로)
};

export function summarize(rows: DayRow[]): Summary {
  const bottled = sum(rows, "bottled");
  const inoculated = sum(rows, "inoculated");
  const contaminated = sum(rows, "contaminated");
  const good = sum(rows, "good");
  const defect = sum(rows, "defect");
  // kg 소수 첫째 자리끼리 더한 값의 부동소수 꼬리를 자른다(120.1 + 0.2 = 120.30000000000001)
  const harvest = good === null && defect === null ? null : round1((good ?? 0) + (defect ?? 0));
  return {
    bottled,
    inoculated,
    contaminated,
    good: good === null ? null : round1(good),
    defect: defect === null ? null : round1(defect),
    harvest,
    defectRate: ratio(defect, harvest), // 불량을 한 번도 안 적은 기간은 「—」(빈칸 ≠ 0)
    contaminationRate: ratio(contaminated, inoculated),
    gramsPerBottle: ratio(harvest === null ? null : harvest * 1000, bottled),
  };
}

// 호실별 비교: 수확 많은 순
export type RoomTotal = { roomId: number; name: string; isActive: boolean; good: number | null; defect: number | null };
export type RoomRank = RoomTotal & { harvest: number; defectRate: number | null };
export function rankRooms(rooms: RoomTotal[]): RoomRank[] {
  return rooms
    .map((r) => {
      const harvest = round1((r.good ?? 0) + (r.defect ?? 0));
      return { ...r, harvest, defectRate: ratio(r.defect, harvest) };
    })
    .filter((r) => r.good !== null || r.defect !== null)
    .sort((a, b) => b.harvest - a.harvest || a.name.localeCompare(b.name, "ko"));
}

// DB 호실·항목 합계 → 호실별 정품·불량
export function toRoomTotals(rows: RoomTotalRow[], rooms: { id: number; name: string; isActive: boolean }[], roles: RoleIds): RoomTotal[] {
  const sumOf = (roomId: number, role: FieldRole) => rows.find((r) => r.roomId === roomId && r.fieldId === roles[role])?.sum ?? null;
  return rooms.map((r) => ({ roomId: r.id, name: r.name, isActive: r.isActive, good: sumOf(r.id, "good"), defect: sumOf(r.id, "defect") }));
}
