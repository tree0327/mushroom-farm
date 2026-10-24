import { describe, expect, it } from "vitest";
import { addDays, formatDayLabel, formatKstMdHm, kstYmd } from "./date";

describe("날짜 도우미", () => {
  it("날짜 더하기: 월말·연말·윤년을 넘는다", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("요일 표시", () => {
    expect(formatDayLabel("2026-10-23")).toBe("10월 23일 금요일");
  });

  it("한국 날짜: UTC 15시는 다음날", () => {
    expect(kstYmd(new Date("2026-10-22T15:00:00Z"))).toBe("2026-10-23");
    expect(kstYmd(new Date("2026-10-22T14:59:59Z"))).toBe("2026-10-22");
  });

  it("한국 시각 표시", () => {
    expect(formatKstMdHm("2026-10-23T12:05:00Z")).toBe("10/23 21:05");
  });
});
