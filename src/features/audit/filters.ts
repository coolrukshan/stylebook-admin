import { z } from "zod";

/** Action prefixes the API matches (a trailing "." means "starts with"). */
export const AREAS = [
  { value: "application.", label: "Salon applications" },
  { value: "user.", label: "Users" },
  { value: "partner_account.", label: "Partner accounts" },
  { value: "salon.", label: "Salons" },
  { value: "payout_account.", label: "Payout accounts" },
  { value: "payout_run.", label: "Payout runs" },
  { value: "dispute.", label: "Disputes" },
  { value: "fees.", label: "Fees" },
  { value: "moderation.", label: "Moderation" },
  { value: "engagement.", label: "Re-engagement" },
  { value: "ticket.", label: "Tickets" },
  { value: "catalogue.", label: "Catalogue" },
  { value: "setting.", label: "Platform settings" },
  { value: "announcement.", label: "Announcements" },
  { value: "admin_user.", label: "Admins and roles" },
] as const;

export const ACTOR_ROLES = [
  "super_admin",
  "admin",
  "support",
  "finance",
  "moderator",
  "system",
  "owner",
  "partner",
  "client",
] as const;

export const DEFAULT_RANGE_DAYS = 30;

export type AuditFilters = {
  /** UTC calendar dates (the API filters by UTC day), inclusive. */
  from: string;
  to: string;
  area?: string;
  role?: string;
  actor?: string;
  targetType?: string;
  targetId?: string;
};

type Raw = Record<string, string | string[] | undefined>;

const isoDate = z.iso.date();
const targetType = z.string().regex(/^[a-z_]{1,64}$/);

const utcDay = (d: Date) => d.toISOString().slice(0, 10);

export function defaultRange(now: Date): { from: string; to: string } {
  const start = new Date(now.getTime() - (DEFAULT_RANGE_DAYS - 1) * 86_400_000);
  return { from: utcDay(start), to: utcDay(now) };
}

/** Reads filters from the URL; anything invalid is ignored. */
export function parseFilters(raw: Raw, now: Date): AuditFilters {
  const first = (key: string) => {
    const v = raw[key];
    return (Array.isArray(v) ? v[0] : v) || undefined;
  };
  const valid = <T>(schema: z.ZodType<T>, key: string): T | undefined => schema.safeParse(first(key)).data;
  const range = defaultRange(now);
  const type = valid(targetType, "targetType");
  const target = valid(z.uuid(), "targetId");
  return {
    from: valid(isoDate, "from") ?? range.from,
    to: valid(isoDate, "to") ?? range.to,
    area: AREAS.find((a) => a.value === first("area"))?.value,
    role: ACTOR_ROLES.find((r) => r === first("role")),
    actor: valid(z.uuid(), "actor"),
    // A subject filter needs both halves.
    ...(type && target ? { targetType: type, targetId: target } : {}),
  };
}

export const isInvalidRange = (f: AuditFilters) => f.from > f.to;

export function toApiQuery(f: AuditFilters) {
  return {
    from_date: f.from,
    to_date: f.to,
    action: f.area,
    actor_role: f.role,
    actor_id: f.actor,
    target_type: f.targetType,
    target_id: f.targetId,
  };
}

/** URL query string for these filters (no cursor: a new filter starts at page 1). */
export function toSearchParams(f: AuditFilters): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) params.set(k, v);
  return params.toString();
}
