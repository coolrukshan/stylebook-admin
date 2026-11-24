import { describe, expect, it } from "vitest";
import { formatChange, formatCount } from "./queries";

describe("dashboard formatting", () => {
  it("formats counts and renders a dash when missing", () => {
    expect(formatCount(1240)).toBe("1,240");
    expect(formatCount(0)).toBe("0");
    expect(formatCount(undefined)).toBe("-");
    expect(formatCount(NaN)).toBe("-");
  });
  it("formats change percent or omits it", () => {
    expect(formatChange(6.04)).toBe("+6% vs previous 7 days");
    expect(formatChange(-2.55)).toBe("-2.5% vs previous 7 days");
    expect(formatChange(null)).toBeUndefined();
  });
});
