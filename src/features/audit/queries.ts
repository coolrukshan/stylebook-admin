import "server-only";
import { cache } from "react";
import { listAllAdmins } from "@/features/roles/list";
import { getApiClient } from "@/lib/api/client";
import { ApiError, errorFromResponse } from "@/lib/api/errors";
import { toApiQuery, type AuditFilters } from "./filters";
import { auditListSchema } from "./schemas";

export const PAGE_SIZE = 50;

export async function getAuditEntries(filters: AuditFilters, cursor?: string) {
  const api = await getApiClient();
  const { data, error, response } = await api.GET("/v1/admin/audit", {
    params: { query: { ...toApiQuery(filters), cursor, limit: PAGE_SIZE } },
  });
  if (!data) throw errorFromResponse(response, error, response.headers.get("x-request-id"));
  const out = auditListSchema.parse(data);
  return { entries: out.items, nextCursor: out.next_cursor ?? null };
}

/**
 * Admin names by id, for the "Who" column. Only some viewers may list admins,
 * so any API refusal or failure leaves the map empty and ids are shown instead.
 */
export const getAdminNames = cache(async (): Promise<ReadonlyMap<string, string>> => {
  try {
    const { admins } = await listAllAdmins(await getApiClient());
    return new Map(admins.map((a) => [a.id, a.name]));
  } catch (error) {
    if (error instanceof ApiError) return new Map();
    throw error;
  }
});
