import { describe, expect, it } from "vitest";
import { swapOrder } from "@/shared/lib/reorder";

describe("swapOrder", () => {
  it("위·아래 칸과 바꾼다", () => {
    expect(swapOrder([1, 2, 3], 2, "up")).toEqual([2, 1, 3]);
    expect(swapOrder([1, 2, 3], 2, "down")).toEqual([1, 3, 2]);
  });
  it("맨 끝이거나 없는 id 면 null", () => {
    expect(swapOrder([1, 2, 3], 1, "up")).toBeNull();
    expect(swapOrder([1, 2, 3], 3, "down")).toBeNull();
    expect(swapOrder([1, 2, 3], 9, "up")).toBeNull();
  });
});
