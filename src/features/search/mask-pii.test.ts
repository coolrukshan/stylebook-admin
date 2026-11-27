import { describe, expect, it } from "vitest";
import { maskPii } from "./mask-pii";

describe("maskPii", () => {
  it("masks emails and phone numbers, keeps other text", () => {
    expect(maskPii("alice@example.com · Colombo")).toBe("a•••@example.com · Colombo");
    expect(maskPii("+94 77 123 4567")).toBe("+94••••67");
    expect(maskPii("BK-20931 · 3 items")).toBe("BK-20931 · 3 items");
  });
  it("keeps ISO dates but still masks numbers around them", () => {
    expect(maskPii("Moved from 2026-10-31 to 2026-11-02")).toBe("Moved from 2026-10-31 to 2026-11-02");
    expect(maskPii("On 2026-10-31 called 0771234567")).toBe("On 2026-10-31 called 077••••67");
    expect(maskPii("acct 1234-5678-9012")).not.toContain("5678");
  });
  it("handles empty", () => {
    expect(maskPii(null)).toBe("");
    expect(maskPii(undefined)).toBe("");
  });
});
