import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getApiClient } from "@/lib/api/client";
import { errorFromResponse } from "@/lib/api/errors";
import { applyFilter, verifiedParam, type AccountFilter } from "./account-status";
import { payoutAccountListSchema, payoutRunListSchema, payoutRunSchema } from "./schemas";

export const getPayoutAccounts = cache(async (filter: AccountFilter, cursor?: string) => {
  const api = await getApiClient();
  const { data, error, response } = await api.GET("/v1/admin/payout-accounts", {
    params: { query: { verified: verifiedParam(filter), limit: 50, cursor: cursor ?? null } },
  });
  if (!data) throw errorFromResponse(response, error, response.headers.get("x-request-id"));
  const parsed = payoutAccountListSchema.parse(data);
  return { items: applyFilter(parsed.items, filter), nextCursor: parsed.next_cursor ?? null };
});

export const getPayoutRuns = cache(async (cursor?: string) => {
  const api = await getApiClient();
  const { data, error, response } = await api.GET("/v1/admin/payout-runs", {
    params: { query: { limit: 20, cursor: cursor ?? null } },
  });
  if (!data) throw errorFromResponse(response, error, response.headers.get("x-request-id"));
  const parsed = payoutRunListSchema.parse(data);
  return { items: parsed.items.filter((r) => !r.dry_run), nextCursor: parsed.next_cursor ?? null };
});

/** Newest real (non dry-run) run, or null. No "current run" endpoint exists. */
export const getLatestPayoutRun = cache(async () => {
  const { items } = await getPayoutRuns();
  return [...items].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] ?? null;
});

export const getPayoutRun = cache(async (id: string) => {
  const api = await getApiClient();
  const { data, error, response } = await api.GET("/v1/admin/payout-runs/{run_id}", {
    params: { path: { run_id: id } },
  });
  if (!data) {
    const err = errorFromResponse(response, error, response.headers.get("x-request-id"));
    if (err.status === 404 || err.status === 422) notFound();
    throw err;
  }
  return payoutRunSchema.parse(data);
});
