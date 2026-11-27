import { StatCard } from "@/components/sb/stat-card";
import type { EngagementStats } from "../schemas";

const int = new Intl.NumberFormat("en-US");
const UNAVAILABLE = "Not available yet";

export function KpiCards({ stats }: { stats: EngagementStats }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard
        label="Nudges sent · 30 days"
        value={int.format(stats.total_nudges_sent)}
        hint={`Holdout group: ${int.format(stats.holdout_group.size)} clients`}
      />
      <StatCard label="Extra bookings vs holdout" value={UNAVAILABLE} hint="Waiting for an API estimate" />
      <StatCard label="Opt-out rate" value={UNAVAILABLE} hint="Reminders and offers" />
    </div>
  );
}
