import { Suspense } from "react";
import { SectionBoundary } from "@/components/sb/section-boundary";
import { CardSkeleton } from "@/components/sb/skeletons";
import { TopBar } from "@/components/sb/top-bar";
import { KpiCards } from "@/features/engagement/components/kpi-cards";
import { RebookingChart } from "@/features/engagement/components/rebooking-chart";
import { SettingsCard } from "@/features/engagement/components/settings-card";
import { StatsSection } from "@/features/engagement/components/stats-section";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-role";

export default async function EngagementPage() {
  const me = await requirePermission("engagement.view");
  return (
    <>
      <TopBar title="Re-engagement" subtitle="Win-back notifications measured against a holdout group" />
      <div className="space-y-6">
        <SectionBoundary title="Couldn't load the numbers">
          <Suspense fallback={<CardSkeleton />}>
            <StatsSection render={(stats) => <KpiCards stats={stats} />} />
          </Suspense>
        </SectionBoundary>
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-6">
          <SectionBoundary title="Couldn't load the chart">
            <Suspense fallback={<CardSkeleton className="h-64" />}>
              <StatsSection render={(stats) => <RebookingChart stats={stats} />} />
            </Suspense>
          </SectionBoundary>
          <SettingsCard canReset={hasPermission(me, "engagement.edit")} />
        </div>
      </div>
    </>
  );
}
