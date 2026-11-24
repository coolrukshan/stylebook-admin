import Link from "next/link";
import { EmptyState } from "@/components/sb/empty-state";
import { StatusPill } from "@/components/sb/status-pill";
import { formatDateTime } from "@/lib/format/date";
import { formatLkr } from "@/lib/format/money";
import type { PayoutRun } from "../schemas";
import { periodLabel } from "./payout-run-card";

export function RunHistory({ runs, nextHref }: { runs: PayoutRun[]; nextHref: string | null }) {
  if (runs.length === 0) return <EmptyState message="No payout runs yet" />;
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <table aria-label="Payout runs" className="w-full text-sm">
        <thead className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            {["Period", "Salons", "Net to salons", "Status", "Created"].map((h) => (
              <th key={h} className="px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-t border-line">
              <td className="px-4 py-3">
                <Link href={`/payouts/runs/${r.id}`} className="font-semibold text-text underline-offset-4 hover:underline">
                  {periodLabel(r)}
                </Link>
              </td>
              <td className="px-4 py-3">{r.salon_count}</td>
              <td className="px-4 py-3">{formatLkr(r.net_total_cents)}</td>
              <td className="px-4 py-3">
                <StatusPill status={r.status} />
              </td>
              <td className="px-4 py-3">{formatDateTime(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {nextHref && (
        <div className="border-t border-line px-4 py-3 text-right">
          <Link href={nextHref} className="text-sm font-semibold text-amber underline-offset-4 hover:underline">
            Next page
          </Link>
        </div>
      )}
    </div>
  );
}
