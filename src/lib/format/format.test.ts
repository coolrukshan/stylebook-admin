import { describe, expect, it } from "vitest";
import { formatAuditTime, formatDateTime, formatMonthYear, formatRelative } from "./date";
import { formatId, MONO_CLASS } from "./ids";
import { formatLkr, formatLkrCompact } from "./money";
import { formatPercent } from "./percent";

describe("formatLkr", () => {
  it.each([
    [0, "LKR 0"],
    [150, "LKR 1.50"],
    [1, "LKR 0.01"],
    [150_000, "LKR 1,500"],
    [100_000_000, "LKR 1,000,000"],
    [816_556_800, "LKR 8,165,568"],
    [-2_500, "-LKR 25"],
  ])("%i cents -> %s", (cents, out) => expect(formatLkr(cents)).toBe(out));

  it("rejects non-integer cents instead of guessing", () => {
    expect(() => formatLkr(10.5)).toThrow(RangeError);
    expect(() => formatLkr(NaN)).toThrow(RangeError);
  });
});

describe("formatLkrCompact", () => {
  it.each([
    [0, "LKR 0"],
    [99_900, "LKR 999"],
    [150_000, "LKR 1.5k"],
    [71_400_000, "LKR 714k"],
    [890_000_000, "LKR 8.9M"],
    [800_000_000, "LKR 8M"],
    [250_000_000_000, "LKR 2.5B"],
  ])("%i -> %s", (cents, out) => expect(formatLkrCompact(cents)).toBe(out));
});

describe("dates (Asia/Colombo, +05:30, no DST)", () => {
  it("formats a UTC input in Colombo time", () => {
    // 2026-10-29T04:00:00Z = 09:30 IST
    expect(formatDateTime("2026-10-29T04:00:00Z")).toBe("Thu 29 Oct, 9:30 AM");
  });
  it("crosses midnight into the next Colombo day", () => {
    // 18:45Z on the 28th = 00:15 on the 29th in Colombo
    expect(formatDateTime("2026-10-28T18:45:00Z")).toBe("Thu 29 Oct, 12:15 AM");
  });
  it("accepts offset inputs and Date objects", () => {
    expect(formatDateTime("2026-10-29T09:30:00+05:30")).toBe("Thu 29 Oct, 9:30 AM");
    expect(formatDateTime(new Date("2026-10-29T04:00:00Z"))).toBe("Thu 29 Oct, 9:30 AM");
  });
  it("month and year", () => {
    expect(formatMonthYear("2026-02-10T00:00:00Z")).toBe("Feb 2026");
    expect(formatMonthYear("2026-01-31T20:00:00Z")).toBe("Feb 2026"); // Colombo is already Feb 1
  });
  it("audit time always shows the zone", () => {
    expect(formatAuditTime("2026-10-29T04:00:05Z")).toBe("Thu 29 Oct 2026, 09:30:05 UTC+05:30");
  });
  it("relative", () => {
    const now = new Date("2026-10-29T04:00:00Z");
    expect(formatRelative("2026-10-26T04:00:00Z", now)).toBe("3 days ago");
    expect(formatRelative("2026-10-29T03:59:40Z", now)).toBe("just now");
  });
  it("throws on invalid input", () => {
    expect(() => formatDateTime("nope")).toThrow(RangeError);
  });
});

describe("ids and percent", () => {
  it("shows ids as given", () => {
    expect(formatId("BK-20931")).toBe("BK-20931");
    expect(MONO_CLASS).toContain("font-mono");
  });
  it("percent keeps API precision", () => {
    expect(formatPercent(4)).toBe("4%");
    expect(formatPercent(0.6)).toBe("0.6%");
    expect(formatPercent(4.1)).toBe("4.1%");
  });
});
