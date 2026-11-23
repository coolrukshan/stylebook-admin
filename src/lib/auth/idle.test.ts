import { describe, expect, it } from "vitest";
import { evaluateSession, safeNextPath } from "./idle";
import { IDLE_LIMIT_MS } from "./session-options";

const NOW = 1_000_000_000_000;
const base = { accessToken: "t", adminId: "a", expiresAt: NOW + 3_600_000 };

describe("evaluateSession", () => {
  it("anonymous without a token", () => {
    expect(evaluateSession({}, NOW)).toBe("anonymous");
    expect(evaluateSession(null, NOW)).toBe("anonymous");
  });
  it("active within the idle window", () => {
    expect(evaluateSession({ ...base, lastActiveAt: NOW - 1000 }, NOW)).toBe("active");
    expect(evaluateSession({ ...base, lastActiveAt: NOW - IDLE_LIMIT_MS + 1 }, NOW)).toBe("active");
  });
  it("idle at exactly 30 minutes", () => {
    expect(evaluateSession({ ...base, lastActiveAt: NOW - IDLE_LIMIT_MS }, NOW)).toBe("idle");
  });
  it("expired token wins over idle (redirect to /login, not /lock)", () => {
    expect(evaluateSession({ ...base, expiresAt: NOW - 1, lastActiveAt: NOW - IDLE_LIMIT_MS - 1 }, NOW)).toBe("expired");
  });
});

describe("safeNextPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeNextPath("/users?q=1")).toBe("/users?q=1");
  });
  it.each(["//evil.com", "https://evil.com", "/\\evil.com", "", null, undefined, "users"])(
    "rejects %s",
    (v) => expect(safeNextPath(v as string | null | undefined)).toBe("/"),
  );
});
