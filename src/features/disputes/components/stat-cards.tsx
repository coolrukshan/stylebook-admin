import { StatCard } from "@/components/sb/stat-card";

const UNAVAILABLE = "Not available yet";

/**
 * The API has no disputes stats endpoint, and the console never calculates
 * totals, so the three spec cards show their titles with an honest placeholder.
 */
export function StatCards() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard label="Refunds this week" value={UNAVAILABLE} hint="Waiting for an API stats endpoint" />
      <StatCard label="Solved by salons in 48 h" value={UNAVAILABLE} hint="Waiting for an API stats endpoint" />
      <StatCard label="Chargebacks" value={UNAVAILABLE} hint="Last 30 days" />
    </div>
  );
}
