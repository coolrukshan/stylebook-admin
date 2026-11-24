import { Suspense } from "react";
import { TopBar } from "@/components/sb/top-bar";
import { CardSkeleton } from "@/components/sb/skeletons";
import { KpiGrid } from "@/features/dashboard/components/kpi-grid";
import { TasksPanel } from "@/features/dashboard/components/tasks-panel";
import { allowedTasks } from "@/features/dashboard/tasks";
import { getNavCounts } from "@/lib/api/nav-counts";
import { requirePermission } from "@/lib/auth/require-role";

async function Tasks({ me }: { me: Awaited<ReturnType<typeof requirePermission>> }) {
  const tasks = allowedTasks(me);
  const counts = tasks.length ? await getNavCounts(tasks.map((t) => t.key)) : {};
  return <TasksPanel tasks={tasks} initial={counts} />;
}

export default async function DashboardPage() {
  const me = await requirePermission("dashboard.view");
  return (
    <>
      <TopBar title="Platform overview" subtitle="Last 7 days · all countries" />
      <div className="space-y-6">
        <KpiGrid />
        <Suspense fallback={<CardSkeleton className="h-48" />}>
          <Tasks me={me} />
        </Suspense>
      </div>
    </>
  );
}
