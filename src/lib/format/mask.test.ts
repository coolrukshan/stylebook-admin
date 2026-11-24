import { describe, expect, it } from "vitest";
import { maskEmail, maskPhone } from "./mask";

describe("maskEmail", () => {
  it("keeps first and last character of the local part", () => {
    expect(maskEmail("nimal.perera@example.com")).toBe("n••••a@example.com");
  });
  it("handles short local parts and bad input", () => {
    expect(maskEmail("ab@x.lk")).toBe("a••••@x.lk");
    expect(maskEmail("not-an-email")).toBe("••••");
    expect(maskEmail(null)).toBe("");
  });
  it("never leaks the middle of the local part", () => {
    expect(maskEmail("secretname@x.lk")).not.toContain("ecretnam");
  });
});

describe("maskPhone", () => {
  it.each(["+94771234567", "0771234567", "94771234567", "077 123 4567", "+94 77 123 4567"])("formats %s", (p) => {
    expect(maskPhone(p)).toBe("+94 77 ••• 4567");
  });
  it("falls back to the last four digits for unknown formats", () => {
    expect(maskPhone("12345678901234")).toBe("••••1234");
    expect(maskPhone("12")).toBe("••••");
    expect(maskPhone(undefined)).toBe("");
  });
  it("never exposes middle digits", () => {
    expect(maskPhone("+94771239999")).not.toContain("123");
  });
});
