import { describe, expect, it } from "vitest";
import { redact } from "./log";

describe("redact", () => {
  it("masks known PII keys at any depth and keeps the rest", () => {
    const out = redact({
      action: "x",
      email: "a@b.lk",
      nested: { owner_phone: "0771234567", list: [{ account_number: "123", ok: 1 }] },
      q: "alice",
      reason: "Suspected fraud",
    });
    expect(out).toEqual({
      action: "x",
      email: "[redacted]",
      nested: { owner_phone: "[redacted]", list: [{ account_number: "[redacted]", ok: 1 }] },
      q: "[redacted]",
      reason: "[redacted]",
    });
  });
  it("is case-insensitive on keys and survives primitives", () => {
    expect(redact({ Authorization: "Bearer x" })).toEqual({ Authorization: "[redacted]" });
    expect(redact("plain")).toBe("plain");
    expect(redact(null)).toBeNull();
  });
});
