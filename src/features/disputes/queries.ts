import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getApiClient } from "@/lib/api/client";
import { errorFromResponse } from "@/lib/api/errors";
import { disputeListSchema, disputeSchema } from "./schemas";
import { shortName, sortQueue, VIEW_STATUSES, type View } from "./status";

const PAGE = 20;

/** Merges one call per status (the API filter takes a single status). First page of each. */
export const getDisputes = cache(async (view: View) => {
  const api = await getApiClient();
  const results = await Promise.all(
    VIEW_STATUSES[view].map(async (status) => {
      const { data, error, response } = await api.GET("/v1/admin/disputes", {
        params: { query: { status, limit: PAGE } },
      });
      if (!data) throw errorFromResponse(response, error, response.headers.get("x-request-id"));
      return disputeListSchema.parse(data);
    }),
  );
  return {
    items: sortQueue(results.flatMap((r) => r.items)),
    hasMore: results.some((r) => r.next_cursor),
  };
});

/** Uses the shared detail endpoint (admin token acceptance is UNVERIFIED); falls back to the list. */
export const getDispute = cache(async (id: string) => {
  const api = await getApiClient();
  const { data, error, response } = await api.GET("/v1/disputes/{dispute_id}", {
    params: { path: { dispute_id: id } },
  });
  if (data) return disputeSchema.parse(data);
  const err = errorFromResponse(response, error, response.headers.get("x-request-id"));
  if (err.status === 401) throw err;
  for (const view of ["active", "decided"] as const) {
    const found = (await getDisputes(view).catch(() => null))?.items.find((d) => d.id === id);
    if (found) return found;
  }
  if (err.status === 404 || err.status === 422 || err.status === 403) notFound();
  throw err;
});

export type Parties = { clients: Map<string, string>; salons: Map<string, string> };

/** Names only, deduplicated; a failed lookup is simply absent ("Unknown"). Contact data is never read. */
export const getParties = cache(async (userIds: string[], salonIds: string[]): Promise<Parties> => {
  const api = await getApiClient();
  const clients = new Map<string, string>();
  const salons = new Map<string, string>();
  await Promise.allSettled([
    ...[...new Set(userIds)].map(async (id) => {
      const { data } = await api.GET("/v1/admin/users/{user_id}", { params: { path: { user_id: id } } });
      if (data) clients.set(id, shortName(data.full_name));
    }),
    ...[...new Set(salonIds)].map(async (id) => {
      const { data } = await api.GET("/v1/admin/salons/{salon_id}", { params: { path: { salon_id: id } } });
      const name = (data as { name?: string } | undefined)?.name;
      if (name) salons.set(id, name);
    }),
  ]);
  return { clients, salons };
});
