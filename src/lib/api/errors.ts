import { unstable_rethrow } from "next/navigation";

/**
 * Error shape returned by the StyleBook API: `{code, message, field}`.
 * `code` is stable UPPER_SNAKE_CASE; `message` is NOT shown to admins because
 * it may echo user-supplied data (PII). We show copy mapped from status/code.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly field: string | null;
  readonly requestId: string | null;

  constructor(init: {
    status: number;
    code?: string;
    message?: string;
    field?: string | null;
    requestId?: string | null;
  }) {
    super(init.message ?? `API error ${init.status}`);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code ?? defaultCode(init.status);
    this.field = init.field ?? null;
    this.requestId = init.requestId ?? null;
  }
}

function defaultCode(status: number): string {
  if (status === 0) return "NETWORK_ERROR";
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 422) return "VALIDATION_ERROR";
  if (status === 429) return "RATE_LIMITED";
  return "INTERNAL_ERROR";
}

/** Plain, serialisable error returned from Server Actions to client components. */
export type ActionError = {
  status: number;
  code: string;
  /** Safe-to-display copy. Never the raw API message. */
  message: string;
  field: string | null;
  requestId: string | null;
};

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

const STATUS_COPY: Record<number, string> = {
  0: "Couldn't reach the server. Check your connection and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You don't have permission to do that.",
  404: "That item no longer exists.",
  409: "This was already handled by another admin.",
  422: "Some details are not valid. Check the form and try again.",
  429: "Too many requests. Wait a moment and try again.",
};

/** Copy shown to the admin for an error. Never includes the raw API message. */
export function userMessage(status: number): string {
  if (STATUS_COPY[status]) return STATUS_COPY[status];
  return "Something went wrong on our side. Try again, and quote the request ID if it keeps happening.";
}

export function toActionError(error: ApiError): ActionError {
  return {
    status: error.status,
    code: error.code,
    message: userMessage(error.status),
    field: error.field,
    requestId: error.requestId,
  };
}

export function failure(error: unknown): { ok: false; error: ActionError } {
  const api =
    error instanceof ApiError
      ? error
      : new ApiError({ status: 500, code: "INTERNAL_ERROR" });
  return { ok: false, error: toActionError(api) };
}

/**
 * Builds an ApiError from a non-2xx response. `parsedBody` is the already
 * parsed error body (openapi-fetch consumes the stream); any shape is accepted.
 */
export function errorFromResponse(
  response: Response,
  parsedBody: unknown,
  requestId: string | null,
): ApiError {
  const b = (parsedBody && typeof parsedBody === "object" ? parsedBody : {}) as Record<string, unknown>;
  return new ApiError({
    status: response.status,
    code: typeof b.code === "string" ? b.code : undefined,
    message: typeof b.message === "string" ? b.message : undefined,
    field: typeof b.field === "string" ? b.field : null,
    requestId: response.headers.get("x-request-id") ?? requestId,
  });
}

type FetchResult = { data?: unknown; error?: unknown; response: Response };

/** Unwraps an openapi-fetch result: returns `data` or throws ApiError. */
export async function unwrap<R extends FetchResult>(
  promise: Promise<R>,
): Promise<Exclude<R["data"], undefined>> {
  const { data, error, response } = await promise;
  if (error !== undefined || !response.ok) {
    throw errorFromResponse(response, error, null);
  }
  return data as Exclude<R["data"], undefined>;
}

/**
 * Runs a Server Action body and converts thrown ApiErrors to an ActionResult.
 * Next.js control-flow errors (redirect, forbidden, notFound) are re-thrown.
 */
export async function toActionResult<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}
