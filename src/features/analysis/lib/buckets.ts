// 추이 그래프 칸 묶음
import { addDays } from "@/shared/lib/date";
import { inRange, type Period, type Range } from "@/features/analysis/lib/period";
import { summarize, type DayRow } from "@/features/analysis/lib/metrics";

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

export type BucketGroup<T> = { key: string; label: string; rows: T[] };

// 기간을 칸으로 나누고 줄을 칸에 담는다. 기록 없는 칸도 그래프에 비워 둔다.
export function groupBuckets<T extends { date: string }>(rows: T[], period: Period, range: Range): BucketGroup<T>[] {
  const unit = bucketUnit(period);
  const groups = new Map<string, T[]>();
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
    const k = bucketKey(d, unit);
    if (!groups.has(k)) groups.set(k, []);
  }
  for (const r of inRange(rows, range)) groups.get(bucketKey(r.date, unit))?.push(r);
  return [...groups.entries()].map(([key, rs]) => ({ key, label: bucketLabel(key, unit, range.from), rows: rs }));
}

export function buckets(rows: DayRow[], period: Period, range: Range): Bucket[] {
  return groupBuckets(rows, period, range).map(({ key, label, rows: rs }) => {
    const s = summarize(rs);
    return { key, label, harvest: s.harvest, defectRate: s.defectRate };
  });
}
