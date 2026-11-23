import "server-only";
import { getApiClient } from "./client";

export type NavCountKey = "applications" | "payoutAccounts" | "disputes";
export type NavCount = { count: number; capped: boolean };
export type NavCounts = Partial<Record<NavCountKey, NavCount>>;

const LIMIT = 50; // API maximum

/**
 * The API has no `GET /v1/admin/counts` (open question 1, default: derive).
 * Counts come from the three list endpoints (one page each); a count at the
 * page limit with a next cursor is shown as "50+". Any failed call omits that
 * badge so the sidebar never blocks or shows a wrong number.
 * Swap this one function if the API adds a counts endpoint.
 */
export async function getNavCounts(keys: readonly NavCountKey[]): Promise<NavCounts> {
  const api = await getApiClient();
  const wanted = new Set(keys);

  const tasks: Array<Promise<[NavCountKey, NavCount | null]>> = [];
  const run = (
    key: NavCountKey,
    call: () => Promise<{ data?: { items: unknown[]; next_cursor?: string | null } }>,
  ) => {
    if (!wanted.has(key)) return;
    tasks.push(
      call().then(
        ({ data }): [NavCountKey, NavCount | null] =>
          data
            ? [key, { count: data.items.length, capped: Boolean(data.next_cursor) }]
            : [key, null],
        (): [NavCountKey, NavCount | null] => [key, null],
      ),
    );
  };

  run("applications", () =>
    api.GET("/v1/admin/applications", { params: { query: { status: "pending", limit: LIMIT } } }),
  );
  run("payoutAccounts", () =>
    api.GET("/v1/admin/payout-accounts", { params: { query: { verified: false, limit: LIMIT } } }),
  );
  run("disputes", () =>
    api.GET("/v1/admin/disputes", { params: { query: { status: "admin_review", limit: LIMIT } } }),
  );

  const counts: NavCounts = {};
  for (const [key, value] of await Promise.all(tasks)) {
    if (value) counts[key] = value;
  }
  return counts;
}
