import { describe, expect, it } from "vitest";
import { parseNumber, toCell, toDraft } from "@/features/farm-log/lib/value-input";

type Rule = Parameters<typeof toCell>[0];

const int: Rule = { valueType: "int", min: 0, max: 100, options: [] };
const dec: Rule = { valueType: "decimal", min: -20, max: 60, options: [] };
const choice: Rule = { valueType: "choice", min: null, max: null, options: [{ id: 7, label: "좋음", sortOrder: 1, isActive: true }] };
const text: Rule = { valueType: "text", min: null, max: null, options: [] };

describe("parseNumber", () => {
  it("빈칸은 null, 0 은 0, 쉼표는 지운다", () => {
    expect(parseNumber("  ", int)).toBeNull();
    expect(parseNumber("0", int)).toBe(0);
    expect(parseNumber("1,200", { ...int, max: null })).toBe(1200);
  });
  it("정수 항목에 소수, 범위 밖, 글자는 undefined", () => {
    expect(parseNumber("1.5", int)).toBeUndefined();
    expect(parseNumber("101", int)).toBeUndefined();
    expect(parseNumber("-1", int)).toBeUndefined();
    expect(parseNumber("abc", dec)).toBeUndefined();
  });
  it("소수 항목은 음수·소수를 받는다(범위 안)", () => {
    expect(parseNumber("-3.5", dec)).toBe(-3.5);
    expect(parseNumber("-21", dec)).toBeUndefined();
  });
});

describe("toCell · toDraft", () => {
  it("선택형은 그 항목의 보기 id 만", () => {
    expect(toCell(choice, "7")).toEqual({ num: null, optionId: 7, text: null });
    expect(toCell(choice, "8")).toBeUndefined();
    expect(toCell(choice, "")).toBeNull();
  });
  it("글은 앞뒤 공백을 지우고 500자까지", () => {
    expect(toCell(text, " 물 줌 ")).toEqual({ num: null, optionId: null, text: "물 줌" });
    expect(toCell(text, "가".repeat(501))).toBeUndefined();
  });
  it("값 → 편집 글자로 되돌린다", () => {
    expect(toDraft({ num: 12.5, optionId: null, text: null })).toBe("12.5");
    expect(toDraft({ num: null, optionId: 7, text: null })).toBe("7");
    expect(toDraft(undefined)).toBe("");
  });
});
