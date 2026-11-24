import { describe, expect, it } from "vitest";
import { GENERIC_AUTH_ERROR, GENERIC_FAILURE, lockoutMessage, messageForStatus } from "./messages";

describe("auth messages", () => {
  it("uses one generic message for credential failures", () => {
    for (const s of [401, 403, 404, 422]) expect(messageForStatus(s, null).error).toBe(GENERIC_AUTH_ERROR);
  });
  it("429 locks with minutes when known", () => {
    expect(messageForStatus(429, 61)).toEqual({ error: "Too many attempts. Try again in 2 minutes.", locked: true });
    expect(lockoutMessage(30)).toBe("Too many attempts. Try again in 1 minute.");
    expect(lockoutMessage(null)).toBe("Too many attempts. Try again later.");
  });
  it("other statuses are a generic failure", () => {
    expect(messageForStatus(500, null).error).toBe(GENERIC_FAILURE);
    expect(messageForStatus(0, null).error).toBe(GENERIC_FAILURE);
  });
});
