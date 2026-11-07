// 분석 계산 — 화면은 이 결과만 그린다. 날짜는 모두 YYYY-MM-DD(한국 날짜) 문자열.
import { addDays } from "@/shared/lib/date";

export type Period = "1w" | "1m" | "3m" | "6m" | "1y";
export const PERIODS: { key: Period; label: string }[] = [
  { key: "1w", label: "1주" },
  { key: "1m", label: "1달" },
  { key: "3m", label: "3달" },
  { key: "6m", label: "6달" },
  { key: "1y", label: "1년" },
];
export const isPeriod = (v: unknown): v is Period => PERIODS.some((p) => p.key === v);

// 하루 합계(DB mf_farm_days 한 줄). null = 그날 그 칸을 안 적음.
export type DayRow = {
  date: string;
  bottled: number | null;
  inoculated: number | null;
  contaminated: number | null;
  good: number | null; // 정품 kg (호실 합)
  defect: number | null; // 불량 kg (호실 합)
};

export type Range = { from: string; to: string };

// n달 전 같은 날(그 달에 없는 날이면 그 달 마지막 날)
function addMonths(ymd: string, months: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d, last))).toISOString().slice(0, 10);
}

// 오늘을 끝으로 한 기간. 1주 = 오늘 포함 7일, 1달 = 한 달 전 다음 날부터 오늘까지.
export function periodRange(period: Period, today: string): Range {
  if (period === "1w") return { from: addDays(today, -6), to: today };
  const months = { "1m": 1, "3m": 3, "6m": 6, "1y": 12 }[period];
  return { from: addDays(addMonths(today, -months), 1), to: today };
}

export function dayCount({ from, to }: Range): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
}

// 바로 앞, 같은 날 수의 기간
export function previousRange(range: Range): Range {
  const to = addDays(range.from, -1);
  return { from: addDays(to, -(dayCount(range) - 1)), to };
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

export const inRange = (rows: DayRow[], { from, to }: Range) => rows.filter((r) => r.date >= from && r.date <= to);

// 추이 그래프 묶음: 1주·1달은 일별, 3·6달은 주별(월요일 시작), 1년은 월별
export type Bucket = { key: string; label: string; harvest: number | null; defectRate: number | null };
type BucketUnit = "day" | "week" | "month";
const bucketUnit = (period: Period): BucketUnit =>
  period === "1w" || period === "1m" ? "day" : period === "1y" ? "month" : "week";

function bucketKey(ymd: string, unit: BucketUnit): string {
  if (unit === "day") return ymd;
  if (unit === "month") return ymd.slice(0, 7);
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = 일
  return addDays(ymd, -((dow + 6) % 7)); // 그 주 월요일
}

function bucketLabel(key: string, unit: BucketUnit, from: string): string {
  if (unit === "month") {
    // 1년은 13칸(작년·올해 같은 달이 양 끝)이라 첫 칸과 1월에 연도를 붙인다
    const m = Number(key.slice(5, 7));
    return m === 1 || key === from.slice(0, 7) ? `${key.slice(2, 4)}년 ${m}월` : `${m}월`;
  }
  const start = unit === "week" && key < from ? from : key; // 첫 주는 기간 시작일부터
  return `${Number(start.slice(5, 7))}/${Number(start.slice(8, 10))}`;
}

export function buckets(rows: DayRow[], period: Period, range: Range): Bucket[] {
  const unit = bucketUnit(period);
  const groups = new Map<string, DayRow[]>();
  // 기록 없는 칸도 그래프에 비워 둔다
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
    const k = bucketKey(d, unit);
    if (!groups.has(k)) groups.set(k, []);
  }
  for (const r of inRange(rows, range)) groups.get(bucketKey(r.date, unit))!.push(r);
  return [...groups.entries()].map(([key, rs]) => {
    const s = summarize(rs);
    return { key, label: bucketLabel(key, unit, range.from), harvest: s.harvest, defectRate: s.defectRate };
  });
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
