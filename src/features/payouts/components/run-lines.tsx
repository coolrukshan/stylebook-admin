import { EmptyState } from "@/components/sb/empty-state";
import { formatLkr } from "@/lib/format/money";
import type { PayoutLine } from "../schemas";

/** Per-salon lines exactly as the API reports them. */
export function RunLines({ lines }: { lines: PayoutLine[] }) {
  if (lines.length === 0) return <EmptyState message="No salons in this run" />;
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <table aria-label="Salons in this run" className="w-full text-sm">
        <thead className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            {["Salon", "Gross", "Commission", "Refunds", "Net", "Reference"].map((h) => (
              <th key={h} className="px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="border-t border-line">
              <td className="px-4 py-3 font-semibold text-text">{l.salon_name}</td>
              <td className="px-4 py-3">{formatLkr(l.gross_cents)}</td>
              <td className="px-4 py-3">{formatLkr(l.total_commission_cents ?? l.commission_cents ?? 0)}</td>
              <td className="px-4 py-3">{formatLkr(l.dispute_deductions_cents ?? l.refund_deductions_cents ?? 0)}</td>
              <td className="px-4 py-3 font-medium">{formatLkr(l.net_cents)}</td>
              <td className="px-4 py-3 font-mono text-xs">{l.reference ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
