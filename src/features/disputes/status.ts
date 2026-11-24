import type { Dispute } from "./schemas";

export type DisputeState = "needs_decision" | "salon_window" | "decided";

export function disputeState(d: Pick<Dispute, "status">): DisputeState {
  const s = d.status.toLowerCase();
  if (s === "admin_review") return "needs_decision";
  if (s === "resolved" || s === "rejected") return "decided";
  return "salon_window"; // open, salon_review
}

export type SalonReply =
  | { kind: "replied"; text: string }
  | { kind: "none_after_48h" }
  | { kind: "waiting" };

/** Display mapping from API fields; nothing is computed beyond comparing the deadline. */
export function salonReply(d: Pick<Dispute, "salon_response" | "salon_deadline">, now: Date = new Date()): SalonReply {
  const text = d.salon_response?.trim();
  if (text) return { kind: "replied", text };
  if (d.salon_deadline && Date.parse(d.salon_deadline) <= now.getTime()) return { kind: "none_after_48h" };
  return { kind: "waiting" };
}

/** Whole hours left in the salon's window (rounded up), 0 when passed or unknown. */
export function hoursLeft(deadline: string | null | undefined, now: Date = new Date()): number {
  if (!deadline) return 0;
  const ms = Date.parse(deadline) - now.getTime();
  return ms > 0 ? Math.ceil(ms / 3_600_000) : 0;
}

/** "Tharindu Jayasinghe" -> "Tharindu J."; single names unchanged; empty -> "Unknown". */
export function shortName(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Unknown";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/** First 8 characters of the id, upper case. Shown as an ID, never as an invented DSP- code. */
export const shortId = (id: string) => id.replace(/-/g, "").slice(0, 8).toUpperCase();

export function truncate(text: string, max = 120): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max).trimEnd()}…`;
}

/** Needs decision first, then salon window, then decided; oldest first within each. */
export function sortQueue<T extends Pick<Dispute, "status" | "created_at">>(items: readonly T[]): T[] {
  const rank: Record<DisputeState, number> = { needs_decision: 0, salon_window: 1, decided: 2 };
  return [...items].sort(
    (a, b) => rank[disputeState(a)] - rank[disputeState(b)] || Date.parse(a.created_at) - Date.parse(b.created_at),
  );
}

export const VIEWS = ["active", "decided"] as const;
export type View = (typeof VIEWS)[number];
export const VIEW_STATUSES: Record<View, readonly string[]> = {
  active: ["admin_review", "salon_review"],
  decided: ["resolved", "rejected"],
};
export function parseView(v: string | string[] | undefined): View {
  const s = Array.isArray(v) ? v[0] : v;
  return (VIEWS as readonly string[]).includes(s ?? "") ? (s as View) : "active";
}
