import { describe, expect, it } from "vitest";
import { disputeState, hoursLeft, parseView, salonReply, shortId, shortName, sortQueue, truncate } from "./status";

const NOW = new Date("2026-10-30T12:00:00Z");

describe("disputeState", () => {
  it("maps API statuses", () => {
    expect(disputeState({ status: "admin_review" })).toBe("needs_decision");
    expect(disputeState({ status: "salon_review" })).toBe("salon_window");
    expect(disputeState({ status: "open" })).toBe("salon_window");
    expect(disputeState({ status: "resolved" })).toBe("decided");
    expect(disputeState({ status: "rejected" })).toBe("decided");
  });
});

describe("salonReply", () => {
  it("shows the quote when the salon replied", () => {
    expect(salonReply({ salon_response: " We will refund ", salon_deadline: null }, NOW)).toEqual({ kind: "replied", text: "We will refund" });
  });
  it("distinguishes no reply after the deadline from waiting", () => {
    expect(salonReply({ salon_response: null, salon_deadline: "2026-10-29T12:00:00Z" }, NOW).kind).toBe("none_after_48h");
    expect(salonReply({ salon_response: null, salon_deadline: "2026-10-31T12:00:00Z" }, NOW).kind).toBe("waiting");
    expect(salonReply({ salon_response: "  ", salon_deadline: null }, NOW).kind).toBe("waiting");
  });
});

describe("hoursLeft", () => {
  it("rounds up and floors at zero", () => {
    expect(hoursLeft("2026-10-31T10:30:00Z", NOW)).toBe(23);
    expect(hoursLeft("2026-10-30T12:10:00Z", NOW)).toBe(1);
    expect(hoursLeft("2026-10-29T12:00:00Z", NOW)).toBe(0);
    expect(hoursLeft(null, NOW)).toBe(0);
  });
});

describe("naming helpers", () => {
  it("shortens names to first name and last initial", () => {
    expect(shortName("Tharindu Jayasinghe")).toBe("Tharindu J.");
    expect(shortName("Ayesha")).toBe("Ayesha");
    expect(shortName("  ")).toBe("Unknown");
    expect(shortName(null)).toBe("Unknown");
    expect(shortName("Mary Ann de Silva")).toBe("Mary S.");
  });
  it("makes an 8 character id and never a DSP- code", () => {
    expect(shortId("3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b")).toBe("3F2B8C1E");
  });
  it("truncates long text", () => {
    expect(truncate("abc", 10)).toBe("abc");
    expect(truncate("abcdefghij", 5)).toBe("abcde…");
  });
});

describe("sortQueue and view", () => {
  it("puts Needs decision first and oldest first", () => {
    const a = { status: "salon_review", created_at: "2026-10-01T00:00:00Z" };
    const b = { status: "admin_review", created_at: "2026-10-05T00:00:00Z" };
    const c = { status: "admin_review", created_at: "2026-10-02T00:00:00Z" };
    const d = { status: "resolved", created_at: "2026-09-01T00:00:00Z" };
    const input = [a, b, c, d];
    expect(sortQueue(input)).toEqual([c, b, a, d]);
    expect(input[0]).toBe(a);
  });
  it("defaults to the active view", () => {
    expect(parseView("nope")).toBe("active");
    expect(parseView(["decided"])).toBe("decided");
  });
});
