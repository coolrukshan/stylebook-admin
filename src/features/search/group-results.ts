export const SEARCH_TYPES = ["users", "salons", "bookings", "orders", "disputes"] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export type SearchResult = {
  type: SearchType;
  id: string;
  title: string;
  subtitle: string;
  status: string | null;
  createdAt: string;
  /** null = no destination (bookings/orders): UI opens a read-only dialog. */
  href: string | null;
};

export const TYPE_LABELS: Record<SearchType, string> = {
  users: "Users",
  salons: "Salons",
  bookings: "Bookings",
  orders: "Orders",
  disputes: "Disputes",
};

export const PER_TYPE_CAP = 5;
export const TOTAL_CAP = 15;

export function hrefFor(type: string, id: string): string | null {
  const safe = encodeURIComponent(id);
  if (type === "users") return `/users/${safe}`;
  if (type === "salons") return `/salons/${safe}`;
  if (type === "disputes") return `/disputes/${safe}`;
  return null;
}

export function isSearchType(t: string): t is SearchType {
  return (SEARCH_TYPES as readonly string[]).includes(t);
}

export type ResultGroup = { type: SearchType; label: string; items: SearchResult[] };

/** Groups in fixed order, caps 5 per type and 15 in total. Unknown types are dropped. */
export function groupResults(results: readonly SearchResult[]): ResultGroup[] {
  const groups: ResultGroup[] = [];
  let remaining = TOTAL_CAP;
  for (const type of SEARCH_TYPES) {
    if (remaining <= 0) break;
    const items = results.filter((r) => r.type === type).slice(0, Math.min(PER_TYPE_CAP, remaining));
    if (items.length) {
      groups.push({ type, label: TYPE_LABELS[type], items });
      remaining -= items.length;
    }
  }
  return groups;
}
