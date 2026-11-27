import { describe, expect, it } from "vitest";
import { barWidth, formatRate, uplift } from "./display";
import { resetInputSchema, statsSchema } from "./schemas";

const holdout = { size: 100, organic_return_rate: 0.14, treatment_return_rate: 0.27, lift: 0.9286 };

describe("display", () => {
  it("formats API fractions", () => {
    expect(formatRate(0.314)).toBe("31.4%");
    expect(formatRate(0.27)).toBe("27%");
    expect(formatRate(0)).toBe("0%");
  });
  it("clamps bar widths", () => {
    expect(barWidth(0.5)).toBe("50%");
    expect(barWidth(2)).toBe("100%");
  });
  it("shows the API's relative lift, never a points difference", () => {
    expect(uplift(holdout)).toEqual({ kind: "lift", text: "+93% relative lift" });
    expect(uplift({ ...holdout, lift: -0.1 }).text).toBe("-10% relative lift");
  });
  it("reports no holdout and no baseline", () => {
    expect(uplift({ ...holdout, size: 0 }).kind).toBe("no_holdout");
    expect(uplift({ ...holdout, organic_return_rate: 0, lift: 0 }).kind).toBe("no_baseline");
  });
});

describe("schemas", () => {
  it("bounds the reset input", () => {
    expect(resetInputSchema.safeParse({ percentage: 1, reason: "abc" }).success).toBe(true);
    for (const percentage of [0, 51, 10.5]) expect(resetInputSchema.safeParse({ percentage, reason: "abc" }).success).toBe(false);
    expect(resetInputSchema.safeParse({ percentage: 10, reason: "  " }).success).toBe(false);
  });
  it("rejects rates outside 0 to 1", () => {
    const stats = {
      total_nudges_sent: 1,
      total_nudges_opened: 0,
      total_nudges_converted: 0,
      overall_open_rate: 38,
      overall_conversion_rate: 0,
      holdout_group: holdout,
    };
    expect(statsSchema.safeParse(stats).success).toBe(false);
  });
});
