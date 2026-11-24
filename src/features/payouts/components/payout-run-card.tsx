import Link from "next/link";
import { StatusPill } from "@/components/sb/status-pill";
import { formatLkr } from "@/lib/format/money";
import { formatShortDate } from "@/lib/format/date";
import type { PayoutRun } from "../schemas";

const NOTE_ID = "run-actions-note";

export function periodLabel(run: Pick<PayoutRun, "period_start" | "period_end">): string {
  if (!run.period_start || !run.period_end) return "Period not set";
  return `${formatShortDate(run.period_start)} to ${formatShortDate(run.period_end)}`;
}

/**
 * Every number is an API value, never computed here (net is `net_total_cents`).
 * Approve and Export are visibly unavailable: the API has no approve or
 * bank-file endpoint yet (plan 03, findings 7 and 8).
 */
export function PayoutRunCard({ run }: { run: PayoutRun | null }) {
  if (!run) {
    return (
      <section className="rounded-card border border-line bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text">Payout run</h2>
        <p role="status" className="mt-2 text-muted-foreground">
          No run for this week yet
        </p>
      </section>
    );
  }
  const rows: [string, string][] = [
    ["Salons", String(run.salon_count)],
    ["Gross sales", formatLkr(run.total_cents)],
    ["Commission", formatLkr(run.commission_total_cents)],
    ["Refunds", formatLkr(run.dispute_deductions_total_cents)],
  ];
  return (
    <section aria-labelledby="run-title" className="rounded-card border border-line bg-surface p-6 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="run-title" className="text-lg font-semibold text-text">
            Payout run · {periodLabel(run)}
          </h2>
          <Link href={`/payouts/runs/${run.id}`} className="text-sm font-semibold text-amber underline-offset-4 hover:underline">
            View salons in this run
          </Link>
        </div>
        <StatusPill status={run.status} />
      </div>
      <dl className="mt-4 divide-y divide-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between py-2">
            <dt className="text-text-2">{k}</dt>
            <dd className="font-medium text-text">{v}</dd>
          </div>
        ))}
        <div className="flex justify-between py-3">
          <dt className="font-semibold text-text">Net to salons</dt>
          <dd className="text-lg font-semibold text-text">{formatLkr(run.net_total_cents)}</dd>
        </div>
      </dl>
      <div className="mt-2 flex flex-wrap gap-3">
        <button
          type="button"
          disabled
          aria-describedby={NOTE_ID}
          className="h-10 cursor-not-allowed rounded-pill bg-ink px-5 text-sm font-semibold text-white opacity-50"
        >
          Approve payout run
        </button>
        <button
          type="button"
          disabled
          aria-describedby={NOTE_ID}
          className="h-10 cursor-not-allowed rounded-pill border border-line-strong px-5 text-sm font-semibold text-text opacity-50"
        >
          Export bank file
        </button>
      </div>
      <p id={NOTE_ID} className="mt-3 text-xs text-muted-foreground">
        Approving a run and exporting the bank file are not available yet: the API does not support them. Totals are read from the API.
      </p>
    </section>
  );
}
