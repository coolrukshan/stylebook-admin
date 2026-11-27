import { cn } from "@/lib/utils";
import { barWidth, formatRate, uplift } from "../display";
import type { EngagementStats } from "../schemas";

const int = new Intl.NumberFormat("en-US");

function Bar({ label, rate, className }: { label: string; rate: number; className: string }) {
  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)_4rem] items-center gap-3 text-sm">
      <span className="text-text-2">{label}</span>
      <span aria-hidden className="h-4 overflow-hidden rounded-pill bg-soft">
        <span className={cn("block h-full rounded-pill", className)} style={{ width: barWidth(rate) }} />
      </span>
      <span className="text-right font-semibold text-text">{formatRate(rate)}</span>
    </div>
  );
}

/** One "All stages" block: the API has no per-stage breakdown. Labels carry the meaning, not colour. */
export function RebookingChart({ stats }: { stats: EngagementStats }) {
  const h = stats.holdout_group;
  const lift = uplift(h);
  return (
    <section aria-labelledby="chart-title" className="rounded-card border border-line bg-surface p-6 shadow-card">
      <h2 id="chart-title" className="text-lg font-semibold text-text">
        Rebooking: nudged vs holdout
      </h2>
      <p className="text-sm text-muted-foreground">Share who booked within 14 days, nudged vs holdout, last 30 days</p>
      {stats.total_nudges_sent === 0 ? (
        <p role="status" className="py-8 text-center text-muted-foreground">
          No nudges sent in the last 30 days
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-semibold text-text">
              All stages{" "}
              <span className="font-normal text-muted-foreground">
                · {int.format(stats.total_nudges_sent)} sent · {formatRate(stats.overall_open_rate)} opened
              </span>
            </p>
            <p className={cn("font-semibold", lift.kind === "lift" ? (h.lift >= 0 ? "text-success" : "text-danger") : "text-muted-foreground")}>
              {lift.text}
            </p>
          </div>
          <Bar label="Nudged" rate={h.treatment_return_rate} className="bg-ink" />
          {lift.kind !== "no_holdout" && <Bar label="Holdout" rate={h.organic_return_rate} className="bg-amber-border" />}
          <table className="sr-only">
            <caption>Rebooking within 14 days, last 30 days</caption>
            <thead>
              <tr>
                <th scope="col">Group</th>
                <th scope="col">Booked within 14 days</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Nudged</th>
                <td>{formatRate(h.treatment_return_rate)}</td>
              </tr>
              <tr>
                <th scope="row">Holdout</th>
                <td>{lift.kind === "no_holdout" ? "No holdout" : formatRate(h.organic_return_rate)}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">A breakdown by stage is not available yet.</p>
        </div>
      )}
    </section>
  );
}
