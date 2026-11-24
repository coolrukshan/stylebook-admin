import "server-only";
import { cache } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { subDays } from "date-fns";
import { getApiClient } from "@/lib/api/client";
import { ApiError, errorFromResponse } from "@/lib/api/errors";
import { formatLkrCompact } from "@/lib/format/money";
import { TIME_ZONE } from "@/lib/format/date";

/**
 * One function per card so each fails independently (SectionBoundary).
 * UNVERIFIED: shapes follow the OpenAPI schema (`summary.total`,
 * `change_percent`); no admin credentials were available to confirm units.
 * Revenue/commission totals are ASSUMED to be integer cents.
 * Values are mapped, never recomputed; missing data renders "-".
 */
export type CardData = { value: string; hint?: string };

const DASH = "-";

export const weekRange = cache(() => {
  const now = new Date();
  return {
    from_date: formatInTimeZone(subDays(now, 6), TIME_ZONE, "yyyy-MM-dd"),
    to_date: formatInTimeZone(now, TIME_ZONE, "yyyy-MM-dd"),
  };
});

const report = cache(async (type: string) => {
  const api = await getApiClient();
  const { data, response, error } = await api.GET("/v1/admin/reports", {
    params: { query: { type, period: "week", ...weekRange() } },
  });
  if (!data) throw errorFromResponse(response, error, response.headers.get("x-request-id"));
  return data;
});

const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
export const formatCount = (n: number | undefined | null) => (typeof n === "number" && Number.isFinite(n) ? int.format(n) : DASH);

export function formatChange(percent: number | null | undefined): string | undefined {
  if (typeof percent !== "number" || !Number.isFinite(percent)) return undefined;
  const rounded = Math.round(percent * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}% vs previous 7 days`;
}

export async function getActiveSalons(): Promise<CardData> {
  const r = await report("salons");
  return { value: formatCount(r.summary.total), hint: formatChange(r.summary.change_percent) };
}

export async function getSignups(): Promise<CardData> {
  const r = await report("users");
  return { value: formatCount(r.summary.total), hint: "Clients" };
}

export async function getBookings(): Promise<CardData> {
  const r = await report("bookings");
  // No-show rate is not exposed by the reports endpoint; do not compute it here.
  return { value: formatCount(r.summary.total), hint: formatChange(r.summary.change_percent) };
}

export async function getGmv(): Promise<CardData> {
  const r = await report("revenue");
  const cents = Math.round(r.summary.total);
  return { value: Number.isSafeInteger(cents) ? formatLkrCompact(cents) : DASH, hint: "Services + products" };
}

export async function getCommission(): Promise<CardData> {
  const [r, rate] = await Promise.all([report("commissions"), defaultRate()]);
  const cents = Math.round(r.summary.total);
  return {
    value: Number.isSafeInteger(cents) ? formatLkrCompact(cents) : DASH,
    hint: rate === null ? undefined : `${rate}% default rate`,
  };
}

async function defaultRate(): Promise<number | null> {
  try {
    const api = await getApiClient();
    const { data } = await api.GET("/v1/admin/fees");
    return data?.service_commission_percent ?? null;
  } catch {
    return null; // rate is a hint only; the card still renders
  }
}

export async function getOpenDisputes(): Promise<CardData> {
  const api = await getApiClient();
  const { data, response, error } = await api.GET("/v1/admin/disputes", { params: { query: { limit: 50 } } });
  if (!data) throw errorFromResponse(response, error, response.headers.get("x-request-id"));
  // "Open" = status not resolved (open question 7, confirm with product).
  const open = data.items.filter((d) => d.status !== "resolved" && !d.resolved_at);
  const capped = Boolean(data.next_cursor);
  const value = open.length === 0 ? "0" : `${open.length}${capped ? "+" : ""}`;
  if (open.length === 0) return { value };
  const oldest = Math.min(...open.map((d) => Date.parse(d.created_at)));
  const days = Math.max(0, Math.floor((Date.now() - oldest) / 86_400_000));
  return { value, hint: `Oldest ${days} day${days === 1 ? "" : "s"}` };
}

export { ApiError };
