import { describe, expect, it } from "vitest";
import { accountStatus, applyFilter, maskAccount, parseFilter, sortQueue, verifiedParam } from "./account-status";

const acc = (o: Partial<{ verified: boolean; rejected_at: string | null; created_at: string | null }>) => ({
  verified: false,
  rejected_at: null,
  created_at: "2026-10-01T00:00:00Z",
  ...o,
});

describe("accountStatus", () => {
  it("derives pending, verified and rejected", () => {
    expect(accountStatus(acc({}))).toBe("pending");
    expect(accountStatus(acc({ verified: true }))).toBe("verified");
    expect(accountStatus(acc({ rejected_at: "2026-10-02T00:00:00Z" }))).toBe("rejected");
  });
  it("treats a verified account as verified even with an old rejection", () => {
    expect(accountStatus(acc({ verified: true, rejected_at: "2026-10-02T00:00:00Z" }))).toBe("verified");
  });
});

describe("maskAccount", () => {
  it("shows only the last four digits", () => {
    expect(maskAccount("4821")).toBe("•••• •••• 4821");
    expect(maskAccount("12-34821")).toBe("•••• •••• 4821");
  });
});

describe("filters", () => {
  it("falls back to pending for unknown values", () => {
    expect(parseFilter("nope")).toBe("pending");
    expect(parseFilter(["verified"])).toBe("verified");
  });
  it("maps filters to the API param", () => {
    expect(verifiedParam("verified")).toBe(true);
    expect(verifiedParam("pending")).toBe(false);
    expect(verifiedParam("rejected")).toBe(false);
    expect(verifiedParam("all")).toBeNull();
  });
  it("separates rejected from pending in-page", () => {
    const items = [acc({}), acc({ rejected_at: "2026-10-02T00:00:00Z" }), acc({ verified: true })];
    expect(applyFilter(items, "pending")).toHaveLength(1);
    expect(applyFilter(items, "rejected")).toHaveLength(1);
    expect(applyFilter(items, "all")).toHaveLength(3);
  });
});

describe("sortQueue", () => {
  it("puts pending first, oldest first, without mutating", () => {
    const verified = acc({ verified: true, created_at: "2026-09-01T00:00:00Z" });
    const newer = acc({ created_at: "2026-10-05T00:00:00Z" });
    const older = acc({ created_at: "2026-10-01T00:00:00Z" });
    const input = [verified, newer, older];
    expect(sortQueue(input)).toEqual([older, newer, verified]);
    expect(input[0]).toBe(verified);
  });
});
