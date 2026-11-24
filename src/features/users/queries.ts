import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getApiClient } from "@/lib/api/client";
import { errorFromResponse } from "@/lib/api/errors";
import { isActiveParam, sortNewestFirst, toUserDetail, toUserRow, type StatusFilter } from "./map";
import { userDetailSchema, userListSchema } from "./schemas";

/** `q` is sent to the API only; never logged. Returns masked rows only. */
export const getUsers = cache(async (opts: { q?: string; status: StatusFilter; cursor?: string }) => {
  const api = await getApiClient();
  const q = opts.q?.trim();
  const { data, error, response } = await api.GET("/v1/admin/users", {
    params: { query: { q: q || null, is_active: isActiveParam(opts.status), limit: 50, cursor: opts.cursor ?? null } },
  });
  if (!data) throw errorFromResponse(response, error, response.headers.get("x-request-id"));
  const parsed = userListSchema.parse(data);
  return { rows: sortNewestFirst(parsed.items.map(toUserRow)), nextCursor: parsed.next_cursor ?? null };
});

export const getUser = cache(async (id: string) => {
  const api = await getApiClient();
  const { data, error, response } = await api.GET("/v1/admin/users/{user_id}", {
    params: { path: { user_id: id } },
  });
  if (!data) {
    const err = errorFromResponse(response, error, response.headers.get("x-request-id"));
    if (err.status === 404 || err.status === 422) notFound();
    throw err;
  }
  return toUserDetail(userDetailSchema.parse(data));
});
