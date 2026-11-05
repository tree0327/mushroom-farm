import { describe, expect, it } from "vitest";
import {
  buckets,
  dayCount,
  inRange,
  periodRange,
  previousRange,
  rankRooms,
  summarize,
  type DayRow,
} from "@/features/analysis/stats";

const day = (date: string, v: Partial<Omit<DayRow, "date">> = {}): DayRow => ({
  date,
  bottled: null,
  inoculated: null,
  contaminated: null,
  good: null,
  defect: null,
  ...v,
});

// 손으로 계산한 표본: 2026-10-23 ~ 11-05 두 주, 호실 합은 이미 더해진 값
const ROWS: DayRow[] = [
  day("2026-10-23", { bottled: 1000, inoculated: 1000, contaminated: 20, good: 100, defect: 10 }), // 앞 주
  day("2026-10-27", { bottled: 1000, inoculated: 900, contaminated: 9, good: 80.5, defect: 4.5 }), // 앞 주
  day("2026-10-30", { good: 120.1, defect: 0.2 }), // 이번 주(10-30~11-05)
  day("2026-11-01", { bottled: 0, inoculated: null, contaminated: null }), // 입병 0(적음)
  day("2026-11-03", { bottled: 1200, inoculated: 1100, contaminated: 11, good: 200, defect: null }),
  day("2026-11-05", { bottled: 800, inoculated: 900, contaminated: 0, good: 79.9, defect: 9.8 }),
];

describe("기간", () => {
  it("1주 = 오늘 포함 7일", () => {
    expect(periodRange("1w", "2026-11-05")).toEqual({ from: "2026-10-30", to: "2026-11-05" });
  });
  it("1달·3달·6달·1년 = n달 전 다음 날부터", () => {
    expect(periodRange("1m", "2026-11-05")).toEqual({ from: "2026-10-06", to: "2026-11-05" });
    expect(periodRange("3m", "2026-11-05")).toEqual({ from: "2026-08-06", to: "2026-11-05" });
    expect(periodRange("6m", "2026-11-05")).toEqual({ from: "2026-05-06", to: "2026-11-05" });
    expect(periodRange("1y", "2026-11-05")).toEqual({ from: "2025-11-06", to: "2026-11-05" });
  });
  it("달 끝 날짜: 3월 31일의 한 달 전은 2월 28일", () => {
    expect(periodRange("1m", "2026-03-31")).toEqual({ from: "2026-03-01", to: "2026-03-31" });
  });
  it("직전 기간 = 바로 앞 같은 날 수", () => {
    const r = periodRange("1w", "2026-11-05");
    expect(previousRange(r)).toEqual({ from: "2026-10-23", to: "2026-10-29" });
    expect(dayCount(previousRange(periodRange("1m", "2026-11-05")))).toBe(31);
  });
});

describe("합계 카드", () => {
  it("이번 주(10-30~11-05) — 손 계산과 같다", () => {
    const s = summarize(inRange(ROWS, periodRange("1w", "2026-11-05")));
    // 입병 0+1200+800 = 2000, 접종 1100+900 = 2000, 오염 11+0 = 11
    // 정품 120.1+200+79.9 = 400.0, 불량 0.2+9.8 = 10.0, 전체 410.0
    expect(s).toEqual({
      bottled: 2000,
      inoculated: 2000,
      contaminated: 11,
      good: 400,
      defect: 10,
      harvest: 410,
      defectRate: 10 / 410, // 2.44%
      contaminationRate: 11 / 2000, // 0.55%
      gramsPerBottle: (410 * 1000) / 2000, // 205 g/병
    });
  });

  it("앞 주(10-23~10-29)", () => {
    const s = summarize(inRange(ROWS, { from: "2026-10-23", to: "2026-10-29" }));
    expect(s.harvest).toBe(195); // 100+10+80.5+4.5
    expect(s.defectRate).toBeCloseTo(14.5 / 195);
    expect(s.contaminationRate).toBeCloseTo(29 / 1900);
  });

  it("기록이 없으면 모두 null(화면은 「—」)", () => {
    expect(summarize([])).toEqual({
      bottled: null,
      inoculated: null,
      contaminated: null,
      good: null,
      defect: null,
      harvest: null,
      defectRate: null,
      contaminationRate: null,
      gramsPerBottle: null,
    });
  });

  it("분모가 0이면 비율은 null", () => {
    const s = summarize([day("2026-11-01", { bottled: 0, inoculated: 0, contaminated: 0 })]);
    expect(s.contaminationRate).toBeNull();
    expect(s.gramsPerBottle).toBeNull();
    expect(s.defectRate).toBeNull();
  });

  it("불량을 한 번도 안 적은 기간은 불량률 「—」(빈칸 ≠ 0), 0을 적으면 0", () => {
    expect(summarize([day("2026-11-01", { good: 50 })]).defectRate).toBeNull();
    expect(summarize([day("2026-11-01", { good: 50, defect: 0 })]).defectRate).toBe(0);
  });
});

describe("추이 묶음", () => {
  it("1주는 일별 7칸, 기록 없는 날도 빈칸으로", () => {
    const b = buckets(ROWS, "1w", periodRange("1w", "2026-11-05"));
    expect(b.map((x) => x.label)).toEqual(["10/30", "10/31", "11/1", "11/2", "11/3", "11/4", "11/5"]);
    expect(b.map((x) => x.harvest)).toEqual([120.3, null, null, null, 200, null, 89.7]);
  });

  it("3달은 주별(월요일 시작), 첫 주 이름은 기간 시작일", () => {
    const range = periodRange("3m", "2026-11-05"); // 08-06(목) ~ 11-05(목)
    const b = buckets(ROWS, "3m", range);
    expect(b[0]).toMatchObject({ key: "2026-08-03", label: "8/6", harvest: null });
    const last = b[b.length - 1]; // 11-02(월) 주: 11-03, 11-05
    expect(last).toMatchObject({ key: "2026-11-02", label: "11/2", harvest: 289.7 });
    const oct26 = b.find((x) => x.key === "2026-10-26")!; // 10-27, 10-30, 11-01
    expect(oct26.harvest).toBe(205.3); // 85 + 120.3
    expect(oct26.defectRate).toBeCloseTo(4.7 / 205.3);
    expect(b).toHaveLength(14);
  });

  it("1년은 월별 13칸(양 끝 11월은 일부), 첫 칸과 1월에 연도", () => {
    const b = buckets(ROWS, "1y", periodRange("1y", "2026-11-05"));
    expect(b.map((x) => x.label)).toEqual(
      ["25년 11월", "12월", "26년 1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월"],
    );
    expect(b.find((x) => x.key === "2026-10")!.harvest).toBe(315.3); // 110 + 85 + 120.3
  });
});

describe("호실별 비교", () => {
  it("수확 많은 순, 기록 없는 호실은 뺀다", () => {
    const r = rankRooms([
      { roomId: 1, name: "1호실", isActive: true, good: 100, defect: 10 },
      { roomId: 2, name: "2호실", isActive: true, good: 200, defect: null },
      { roomId: 3, name: "3호실", isActive: false, good: null, defect: null },
    ]);
    expect(r.map((x) => [x.name, x.harvest, x.defectRate])).toEqual([
      ["2호실", 200, null],
      ["1호실", 110, 10 / 110],
    ]);
  });
});
