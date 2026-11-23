import "server-only";
import { cache } from "react";
import { getApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

/**
 * Current admin from `GET /v1/admin/me`, deduped per request. Returns null when
 * anonymous or the token was rejected (caller redirects to /login).
 */
export const getCurrentAdmin = cache(async () => {
  const api = await getApiClient();
  const { data, response } = await api.GET("/v1/admin/me");
  if (response.status === 401) return null;
  if (!data) {
    throw new ApiError({
      status: response.status,
      requestId: response.headers.get("x-request-id"),
    });
  }
  return data;
});
