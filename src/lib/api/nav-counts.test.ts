import { describe, expect, it } from "vitest";
import { isAwaitingVerification } from "./nav-counts";

describe("isAwaitingVerification", () => {
  it("excludes rejected payout accounts from the badge", () => {
    expect(isAwaitingVerification({ verified: false, rejected_at: null })).toBe(true);
    expect(isAwaitingVerification({ verified: false })).toBe(true);
    expect(isAwaitingVerification({ verified: false, rejected_at: "2026-10-01T00:00:00Z" })).toBe(false);
  });
});
