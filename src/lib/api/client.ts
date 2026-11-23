import "server-only";
import { getAccessToken } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { createApiClient } from "./create-client";

/**
 * API client bound to the current admin session. Server only: the token never
 * reaches browser JS. Pass `idempotencyKey` for writes (see runAdminAction).
 */
export async function getApiClient(opts: { idempotencyKey?: string } = {}) {
  return createApiClient({
    baseUrl: getEnv().API_BASE_URL,
    token: await getAccessToken(),
    idempotencyKey: opts.idempotencyKey,
  });
}

export { createApiClient } from "./create-client";
