// 옛 앱 합계와 같은 결과인지. 시험은 한국 시간대로 돈다(vitest.config 의 TZ).
import { describe, expect, it } from "vitest";
import { buildRecordDateISO, groupByMonth, localYMD, monthTotals, thisWeekTotal, todayTotal, type SalesRecord } from "./totals";

const rec = (id: number, type: "현금" | "카드", final: number, date: string): SalesRecord => ({
  id,
  type,
  original: final,
  final,
  name: "",
  date,
});

// 2026-10-23(금) 한국 시각 기준
const now = new Date("2026-10-23T12:00:00+09:00");
const records = [
  rec(1, "현금", 10000, "2026-10-23T00:30:00+09:00"), // 오늘 새벽(UTC 로는 전날)
  rec(2, "카드", 20000, "2026-10-22T23:59:00+09:00"), // 어제
  rec(3, "현금", 5000, "2026-10-19T10:00:00+09:00"), // 이번 주 월요일
  rec(4, "카드", 7000, "2026-10-18T10:00:00+09:00"), // 지난 주 일요일
  rec(5, "현금", 1000, "2026-09-30T10:00:00+09:00"), // 지난달
];

describe("매출 합계", () => {
  it("시험 시간대가 한국이다", () => {
    expect(new Date("2026-10-22T15:00:00Z").getDate()).toBe(23);
  });

  it("오늘: 한국 자정부터", () => {
    expect(todayTotal(records, now)).toBe(10000);
  });

  it("이번 주: 월~일", () => {
    expect(thisWeekTotal(records, now)).toEqual({ total: 35000, rangeLabel: "10/19~10/25" });
  });

  it("이번 달: 1일~말일, 현금·카드 나눔", () => {
    const m = monthTotals(records, now);
    expect([m.total, m.cash, m.card, m.label]).toEqual([42000, 15000, 27000, "10/1 ~ 10/31"]);
  });

  it("월별 묶음: 최신 달 먼저", () => {
    expect(groupByMonth(records).map((g) => [g.label, g.total])).toEqual([
      ["2026년 10월", 42000],
      ["2026년 9월", 1000],
    ]);
  });

  it("날짜 칸: 한국 새벽에도 하루 밀리지 않는다", () => {
    expect(localYMD("2026-10-22T15:30:00Z")).toBe("2026-10-23");
  });

  it("고칠 때 원래 시각을 지키고 날짜만 바꾼다", () => {
    expect(buildRecordDateISO("2026-10-20", "2026-10-23T21:05:30+09:00")).toBe("2026-10-20T12:05:30.000Z");
  });
});
