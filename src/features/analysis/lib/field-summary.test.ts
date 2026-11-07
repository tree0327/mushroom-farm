import { describe, expect, it } from "vitest";
import type { Field } from "@/features/field/types";
import type { FarmDay } from "@/features/farm-log/types";
import { fieldTrend, numberOf, summarizeField, warnDates } from "@/features/analysis/lib/field-summary";

const field = (v: Partial<Field>): Field => ({
  id: 1,
  scope: "room",
  role: null,
  name: "온도",
  valueType: "decimal",
  unit: "℃",
  min: null,
  max: null,
  warnMin: null,
  warnMax: null,
  summary: "avg",
  sortOrder: 1,
  isActive: true,
  options: [],
  ...v,
});
const day = (date: string, totals: FarmDay["totals"]): FarmDay => ({ date, hasMemo: false, totals });
const t = (sum: number, n: number, min = sum, max = sum) => ({ sum, n, min, max, opts: {} });

describe("숫자 항목", () => {
  const days = [day("2026-10-01", { 1: t(34, 2, 16, 18) }), day("2026-10-02", { 1: t(20, 1) }), day("2026-10-03", {})];

  it("평균은 모든 값(날·호실)의 평균, 합계는 모든 값의 합", () => {
    expect(numberOf(field({}), days)).toBe(18); // (16+18+20)/3
    expect(numberOf(field({ summary: "sum" }), days)).toBe(54);
  });
  it("값이 하나도 없으면 null", () => {
    expect(numberOf(field({}), [day("2026-10-03", {})])).toBeNull();
  });
  it("경고 범위를 벗어난 값이 있는 날 수", () => {
    expect(summarizeField(field({ warnMin: 17 }), days)).toEqual({ kind: "number", value: 18, warnDays: 1 });
    expect(summarizeField(field({ warnMax: 19 }), days)).toEqual({ kind: "number", value: 18, warnDays: 1 });
  });
  it("추이는 칸마다 같은 계산", () => {
    expect(fieldTrend(field({ summary: "sum" }), days, "1w", { from: "2026-10-01", to: "2026-10-03" }).map((p) => p.value)).toEqual([
      34,
      20,
      null,
    ]);
  });
  it("경고 날짜는 켜진 숫자 항목만 본다", () => {
    expect([...warnDates([field({ warnMax: 17 })], days)]).toEqual(["2026-10-01", "2026-10-02"]);
    expect(warnDates([field({ warnMax: 17, isActive: false })], days).size).toBe(0);
  });
});

describe("선택·글 항목", () => {
  it("선택은 보기별 횟수(0 회 보기는 뺀다)", () => {
    const f = field({
      valueType: "choice",
      summary: "none",
      options: [
        { id: 7, label: "좋음", sortOrder: 1, isActive: true },
        { id: 8, label: "나쁨", sortOrder: 2, isActive: true },
      ],
    });
    const days = [day("2026-10-01", { 1: { sum: null, min: null, max: null, n: 2, opts: { 7: 2 } } })];
    expect(summarizeField(f, days)).toEqual({ kind: "choice", counts: [{ id: 7, label: "좋음", count: 2 }], total: 2 });
  });
  it("글은 적은 날 수", () => {
    const days = [day("2026-10-01", { 1: { sum: null, min: null, max: null, n: 1, opts: {} } }), day("2026-10-02", {})];
    expect(summarizeField(field({ valueType: "text", summary: "none" }), days)).toEqual({ kind: "text", days: 1 });
  });
});
