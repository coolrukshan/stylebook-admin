import { describe, expect, it } from "vitest";
import { clamp, diffFees, FEE_FIELDS, formatFee, parseField, parseRupees, toText, type FeeKey, type FeeValues } from "./fields";

const field = (key: FeeKey) => FEE_FIELDS.find((f) => f.key === key)!;
const service = field("service_commission_percent");
const ai = field("ai_credit_price_cents");

describe("parseRupees", () => {
  it.each([
    ["50", 5000],
    ["12.5", 1250],
    ["0.07", 7],
    ["19.99", 1999],
  ])("parses %s without float drift", (t, cents) => expect(parseRupees(t)).toBe(cents));
  it.each(["", "-1", "1.234", "abc", "1,000"])("rejects %s", (t) => expect(parseRupees(t)).toBeNull());
});

describe("fields", () => {
  it("enforces the API bounds", () => {
    expect(parseField(service, "50")).toBe(50);
    expect(parseField(service, "51")).toBeNull();
    expect(parseField(service, "8.5")).toBeNull();
    expect(parseField(field("max_no_show_fee_percent"), "100")).toBe(100);
  });
  it("clamps, including an unbounded maximum", () => {
    expect(clamp(service, 99)).toBe(50);
    expect(clamp(service, -3)).toBe(0);
    expect(clamp(ai, 10_000_000)).toBe(10_000_000);
  });
  it("round-trips money text and formats values", () => {
    expect(toText(ai, 5000)).toBe("50");
    expect(toText(ai, 1205)).toBe("12.05");
    expect(formatFee(ai, 5000)).toBe("LKR 50");
    expect(formatFee(service, 8)).toBe("8%");
  });
  it("lists only changed fields and ignores invalid ones", () => {
    const saved: FeeValues = {
      service_commission_percent: 8,
      product_commission_percent: 10,
      deposit_default_percent: 30,
      max_no_show_fee_percent: 50,
      ai_credit_price_cents: 5000,
    };
    const changes = diffFees(saved, { ...saved, service_commission_percent: 9, product_commission_percent: null });
    expect(changes.map((c) => [c.field.key, c.from, c.to])).toEqual([["service_commission_percent", 8, 9]]);
  });
});
