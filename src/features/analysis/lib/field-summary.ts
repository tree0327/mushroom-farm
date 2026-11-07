// 항목별 요약(분석 카드·추이·경고). 숫자는 항목 설정의 합계/평균, 선택은 보기별 횟수, 글은 적은 날 수.
import { isNumeric, isWarn, type Field } from "@/features/field/types";
import type { FarmDay } from "@/features/farm-log/types";
import { groupBuckets } from "@/features/analysis/lib/buckets";
import type { Period, Range } from "@/features/analysis/lib/period";

export type FieldSummaryValue =
  | { kind: "number"; value: number | null; warnDays: number }
  | { kind: "choice"; counts: { id: number; label: string; count: number }[]; total: number }
  | { kind: "text"; days: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

// 합계 = 모든 값의 합, 평균 = 모든 값(날·호실)의 평균. 값이 하나도 없으면 null.
export function numberOf(field: Field, days: FarmDay[]): number | null {
  const totals = days.flatMap((d) => (d.totals[field.id]?.sum != null ? [d.totals[field.id]] : []));
  if (totals.length === 0) return null;
  const sum = totals.reduce((s, t) => s + (t.sum ?? 0), 0);
  const n = totals.reduce((s, t) => s + t.n, 0);
  return round2(field.summary === "avg" ? sum / n : sum);
}

const isWarnDay = (field: Field, day: FarmDay) => {
  const t = day.totals[field.id];
  return t !== undefined && (isWarn(field, t.min) || isWarn(field, t.max));
};

export function summarizeField(field: Field, days: FarmDay[]): FieldSummaryValue {
  if (isNumeric(field.valueType)) {
    return { kind: "number", value: numberOf(field, days), warnDays: days.filter((d) => isWarnDay(field, d)).length };
  }
  if (field.valueType === "choice") {
    const counts = field.options
      .map((o) => ({ id: o.id, label: o.label, count: days.reduce((s, d) => s + (d.totals[field.id]?.opts[o.id] ?? 0), 0) }))
      .filter((c) => c.count > 0);
    return { kind: "choice", counts, total: counts.reduce((s, c) => s + c.count, 0) };
  }
  return { kind: "text", days: days.filter((d) => (d.totals[field.id]?.n ?? 0) > 0).length };
}

// 숫자 항목 추이(칸마다 합계 또는 평균)
export function fieldTrend(field: Field, days: FarmDay[], period: Period, range: Range) {
  return groupBuckets(days, period, range).map((g) => ({ key: g.key, label: g.label, value: numberOf(field, g.rows) }));
}

// 경고 범위를 벗어난 값이 있는 날(켜진 숫자 항목만)
export function warnDates(fields: Field[], days: FarmDay[]): Set<string> {
  const watched = fields.filter((f) => f.isActive && isNumeric(f.valueType) && (f.warnMin !== null || f.warnMax !== null));
  return new Set(days.filter((d) => watched.some((f) => isWarnDay(f, d))).map((d) => d.date));
}
