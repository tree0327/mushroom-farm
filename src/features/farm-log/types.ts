// 하루 기록 값. 화면·서버 모두 쓴다.

// 칸 하나의 값. 종류에 따라 셋 중 하나만 찬다.
export type Cell = { num: number | null; optionId: number | null; text: string | null };

// 농장 항목은 호실이 없다(farm)
export const cellKey = (fieldId: number, roomId: number | null) => `${fieldId}:${roomId ?? "farm"}`;

export type DayEntry = { memo: string; cells: Record<string, Cell> };

// DB mf_farm_days 한 줄: 항목 id 별 그날 합계(호실 항목은 모든 호실 합)
type FieldTotal = { sum: number | null; min: number | null; max: number | null; n: number; opts: Record<number, number> };
export type FarmDay = { date: string; hasMemo: boolean; totals: Record<number, FieldTotal> };

// DB mf_room_totals 한 줄
export type RoomTotalRow = { roomId: number; fieldId: number; sum: number; n: number };
