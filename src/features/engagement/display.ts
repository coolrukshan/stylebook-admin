import { formatPercent } from "@/lib/format/percent";
import type { EngagementStats } from "./schemas";

/** API fraction -> "31.4%". Display formatting only. */
export const formatRate = (rate: number) => formatPercent(Math.round(rate * 1000) / 10);

export const barWidth = (rate: number) => `${Math.max(0, Math.min(100, rate * 100))}%`;

export type Uplift = { kind: "no_holdout" | "no_baseline" | "lift"; text: string };

/**
 * `lift` is the API's relative lift. It is 0 when the holdout rate is 0, so that
 * case is reported as unavailable. The two arms are never subtracted here.
 */
export function uplift(h: EngagementStats["holdout_group"]): Uplift {
  if (h.size === 0) return { kind: "no_holdout", text: "No holdout, uplift unavailable" };
  if (h.organic_return_rate === 0) return { kind: "no_baseline", text: "Uplift unavailable (no holdout bookings yet)" };
  const pct = Math.round(h.lift * 100);
  return { kind: "lift", text: `${pct > 0 ? "+" : ""}${pct}% relative lift` };
}
