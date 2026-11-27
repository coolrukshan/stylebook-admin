import "server-only";
import type { ApiClient } from "@/lib/api/create-client";
import { unwrap } from "@/lib/api/errors";
import { adminListSchema, toAdminRow, type AdminRow } from "./schemas";

const PAGE_SIZE = 50; // API maximum
const MAX_PAGES = 10;

/** All admin accounts (follows cursors). `truncated` if more than 500 exist. */
export async function listAllAdmins(api: ApiClient): Promise<{ admins: AdminRow[]; truncated: boolean }> {
  const admins: AdminRow[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const out = adminListSchema.parse(
      await unwrap(api.GET("/v1/admin/roles", { params: { query: { limit: PAGE_SIZE, cursor } } })),
    );
    admins.push(...out.items.map(toAdminRow));
    cursor = out.next_cursor ?? undefined;
    if (!cursor) return { admins, truncated: false };
  }
  return { admins, truncated: true };
}
