import { describe, expect, it } from "vitest";
import { maskPii } from "./mask-pii";

describe("maskPii", () => {
  it("masks emails and phone numbers, keeps other text", () => {
    expect(maskPii("alice@example.com · Colombo")).toBe("a•••@example.com · Colombo");
    expect(maskPii("+94 77 123 4567")).toBe("+94••••67");
    expect(maskPii("BK-20931 · 3 items")).toBe("BK-20931 · 3 items");
  });
  it("handles empty", () => {
    expect(maskPii(null)).toBe("");
    expect(maskPii(undefined)).toBe("");
  });
});
