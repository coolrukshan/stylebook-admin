import { ApiError } from "@/lib/api/errors";
import { getEngagementStats } from "../queries";
import type { EngagementStats } from "../schemas";

/** Loads stats and explains a 403 (role or the API's admin IP allow-list); other errors bubble to the boundary. */
export async function StatsSection({ render }: { render: (stats: EngagementStats) => React.ReactNode }) {
  let stats: EngagementStats;
  try {
    stats = await getEngagementStats();
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 403) throw error;
    return (
      <p role="alert" className="rounded-card border border-line bg-surface p-6 text-text-2 shadow-card">
        You don&apos;t have access to engagement data from this network or role.
      </p>
    );
  }
  return <>{render(stats)}</>;
}
