import { describe, expect, it } from "vitest";
import { withSubject, withTopic } from "./korean";

describe("조사", () => {
  it("받침 유무로 이/가, 은/는", () => {
    expect(withSubject("아내")).toBe("아내가");
    expect(withSubject("남편")).toBe("남편이");
    expect(withTopic("아내")).toBe("아내는");
    expect(withTopic("남편")).toBe("남편은");
  });
});
