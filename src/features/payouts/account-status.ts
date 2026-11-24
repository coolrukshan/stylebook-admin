import type { PayoutAccount } from "./schemas";

export type AccountStatus = "pending" | "verified" | "rejected";
export const ACCOUNT_FILTERS = ["pending", "verified", "rejected", "all"] as const;
export type AccountFilter = (typeof ACCOUNT_FILTERS)[number];

/** Display status derived from the API fields (the API has no status enum). */
export function accountStatus(a: Pick<PayoutAccount, "verified" | "rejected_at">): AccountStatus {
  if (a.rejected_at && !a.verified) return "rejected";
  return a.verified ? "verified" : "pending";
}

/** "•••• •••• 4821". The full number is never held by the list. */
export function maskAccount(last4: string): string {
  return `•••• •••• ${last4.replace(/\D/g, "").slice(-4)}`;
}

export function parseFilter(value: string | string[] | undefined): AccountFilter {
  const v = Array.isArray(value) ? value[0] : value;
  return (ACCOUNT_FILTERS as readonly string[]).includes(v ?? "") ? (v as AccountFilter) : "pending";
}

/** API `verified` param for a filter. Rejected accounts have verified=false, so they need an in-page filter. */
export function verifiedParam(filter: AccountFilter): boolean | null {
  if (filter === "verified") return true;
  if (filter === "pending" || filter === "rejected") return false;
  return null;
}

export function applyFilter<T extends Pick<PayoutAccount, "verified" | "rejected_at">>(items: T[], filter: AccountFilter): T[] {
  return filter === "all" ? items : items.filter((a) => accountStatus(a) === filter);
}

const RANK: Record<AccountStatus, number> = { pending: 0, rejected: 1, verified: 2 };

/** Pending first, then oldest created first. Display order within the loaded page only. */
export function sortQueue<T extends Pick<PayoutAccount, "verified" | "rejected_at" | "created_at">>(items: readonly T[]): T[] {
  const t = (x: T) => (x.created_at ? Date.parse(x.created_at) : Number.MAX_SAFE_INTEGER);
  return [...items].sort((a, b) => RANK[accountStatus(a)] - RANK[accountStatus(b)] || t(a) - t(b));
}
