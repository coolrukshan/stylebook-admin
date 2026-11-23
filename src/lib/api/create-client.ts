import createClient, { type Middleware } from "openapi-fetch";
import { ApiError } from "./errors";
import type { paths } from "./schema";

export type ApiClientOptions = {
  baseUrl: string;
  /** Admin JWT from the session. Never sent to the browser. */
  token?: string | null;
  /**
   * Stable key for one logical write (generated when a form opens), so a retry
   * after a timeout reuses it and the API does not create a second audit row.
   * Falls back to a fresh key per request.
   */
  idempotencyKey?: string;
  /** Overridable for tests. */
  fetch?: typeof fetch;
  timeoutMs?: number;
};

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * `X-Request-Id` is generated locally. We send it so API logs and the error
 * card show the same id; if the API echoes its own it takes precedence
 * (see errorFromResponse).
 */
export function createApiClient(opts: ApiClientOptions) {
  const baseFetch = opts.fetch ?? fetch;
  const middleware: Middleware = {
    onRequest({ request }) {
      if (opts.token) request.headers.set("Authorization", `Bearer ${opts.token}`);
      request.headers.set("X-Request-Id", crypto.randomUUID());
      if (!SAFE_METHODS.has(request.method)) {
        request.headers.set(
          "Idempotency-Key",
          opts.idempotencyKey ?? crypto.randomUUID(),
        );
      }
      return request;
    },
    onResponse({ request, response }) {
      // If the API does not echo X-Request-Id, surface the one we sent so the
      // error card always has an id to quote.
      if (response.headers.has("x-request-id")) return undefined;
      const headers = new Headers(response.headers);
      headers.set("x-request-id", request.headers.get("X-Request-Id") ?? "");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    },
    onError({ error, request }) {
      if (error instanceof ApiError) return error;
      return new ApiError({
        status: 0,
        code: "NETWORK_ERROR",
        requestId: request.headers.get("X-Request-Id"),
      });
    },
  };

  const client = createClient<paths>({
    baseUrl: opts.baseUrl,
    // Admin data is never cached by Next or the CDN.
    fetch: (request) =>
      baseFetch(request, {
        cache: "no-store",
        signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
      }),
  });
  client.use(middleware);
  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;
