import { describe, expect, it } from "vitest";
import { errorFromResponse, parseRetryAfter } from "./errors";

describe("retryAfterSeconds", () => {
  it("parses the header, falls back to the body, else null", () => {
    expect(parseRetryAfter("120")).toBe(120);
    expect(parseRetryAfter(null, 59.2)).toBe(60);
    expect(parseRetryAfter("Wed, 21 Oct 2026 07:28:00 GMT")).toBeNull();
    expect(parseRetryAfter(null)).toBeNull();
  });
  it("is carried on the ApiError for 429", () => {
    const res = new Response(null, { status: 429, headers: { "retry-after": "300" } });
    expect(errorFromResponse(res, {}, null).retryAfterSeconds).toBe(300);
  });
});
