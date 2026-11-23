// @vitest-environment node
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApiClient } from "./create-client";
import { ApiError, toActionResult, unwrap } from "./errors";

const BASE = "http://api.test";
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("api client middleware", () => {
  it("sends bearer token and request id on GET, but no idempotency key", async () => {
    let headers: Headers | undefined;
    server.use(
      http.get(`${BASE}/v1/admin/me`, ({ request }) => {
        headers = request.headers;
        return HttpResponse.json({ id: "1" });
      }),
    );
    await createApiClient({ baseUrl: BASE, token: "tok" }).GET("/v1/admin/me");
    expect(headers?.get("authorization")).toBe("Bearer tok");
    expect(headers?.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(headers?.has("idempotency-key")).toBe(false);
  });

  it("reuses a supplied idempotency key across retries of a write", async () => {
    const keys: Array<string | null> = [];
    server.use(
      http.post(`${BASE}/v1/admin/users/:id/suspend`, ({ request }) => {
        keys.push(request.headers.get("idempotency-key"));
        return HttpResponse.json({});
      }),
    );
    const api = createApiClient({ baseUrl: BASE, token: "t", idempotencyKey: "form-key-1" });
    const call = () =>
      api.POST("/v1/admin/users/{user_id}/suspend", {
        params: { path: { user_id: "u1" } },
        body: { reason: "Spam or fake reviews" },
      });
    await call();
    await call();
    expect(keys).toEqual(["form-key-1", "form-key-1"]);
  });

  it("generates a fresh idempotency key per write when none supplied", async () => {
    const keys: Array<string | null> = [];
    server.use(
      http.post(`${BASE}/v1/admin/users/:id/suspend`, ({ request }) => {
        keys.push(request.headers.get("idempotency-key"));
        return HttpResponse.json({});
      }),
    );
    const api = createApiClient({ baseUrl: BASE, token: "t" });
    const call = () =>
      api.POST("/v1/admin/users/{user_id}/suspend", {
        params: { path: { user_id: "u1" } },
        body: { reason: "Spam or fake reviews" },
      });
    await call();
    await call();
    expect(keys[0]).not.toBe(keys[1]);
  });
});

describe("error mapping", () => {
  const cases: Array<[number, string]> = [
    [401, "Your session has expired. Please sign in again."],
    [403, "You don't have permission to do that."],
    [409, "This was already handled by another admin."],
    [422, "Some details are not valid. Check the form and try again."],
    [429, "Too many requests. Wait a moment and try again."],
    [500, "Something went wrong on our side. Try again, and quote the request ID if it keeps happening."],
  ];

  it.each(cases)("maps %i to safe copy and never leaks the raw message", async (status, copy) => {
    server.use(
      http.get(`${BASE}/v1/admin/me`, () =>
        HttpResponse.json(
          { code: "SOME_CODE", message: "user a@b.lk not found", field: "email" },
          { status, headers: { "x-request-id": "req-9" } },
        ),
      ),
    );
    const api = createApiClient({ baseUrl: BASE, token: "t" });
    const result = await toActionResult(() => unwrap(api.GET("/v1/admin/me")));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatchObject({
      status,
      code: "SOME_CODE",
      field: "email",
      requestId: "req-9",
      message: copy,
    });
    expect(JSON.stringify(result)).not.toContain("a@b.lk");
  });

  it("falls back to the locally generated request id when the API does not echo one", async () => {
    let sent: string | null = null;
    server.use(
      http.get(`${BASE}/v1/admin/me`, ({ request }) => {
        sent = request.headers.get("x-request-id");
        return HttpResponse.json({ code: "X", message: "m", field: null }, { status: 500 });
      }),
    );
    const err = await unwrap(createApiClient({ baseUrl: BASE, token: "t" }).GET("/v1/admin/me")).catch((e) => e);
    expect(err.requestId).toBe(sent);
    expect(sent).toBeTruthy();
  });

  it("handles non-JSON error bodies", async () => {
    server.use(http.get(`${BASE}/v1/admin/me`, () => new HttpResponse("<html>bad gateway</html>", { status: 502 })));
    const api = createApiClient({ baseUrl: BASE, token: "t" });
    const result = await toActionResult(() => unwrap(api.GET("/v1/admin/me")));
    expect(result).toMatchObject({ ok: false, error: { status: 502, code: "INTERNAL_ERROR" } });
  });

  it("maps network failures to status 0 with the local request id", async () => {
    server.use(http.get(`${BASE}/v1/admin/me`, () => HttpResponse.error()));
    const api = createApiClient({ baseUrl: BASE, token: "t" });
    const err = await unwrap(api.GET("/v1/admin/me")).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
    expect(err.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
