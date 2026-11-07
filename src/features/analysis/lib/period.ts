// 분석 기간. 날짜는 모두 YYYY-MM-DD(한국 날짜) 문자열.
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

export const inRange = <T extends { date: string }>(rows: T[], { from, to }: Range) => rows.filter((r) => r.date >= from && r.date <= to);
