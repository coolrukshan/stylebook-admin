import { Suspense } from "react";
import { TopBar } from "@/components/sb/top-bar";
import { TableSkeleton } from "@/components/sb/skeletons";
import { ApplicationList } from "@/features/applications/components/application-list";
import { sortOldestFirst } from "@/features/applications/next-selection";
import { getApplicationQueue } from "@/features/applications/queries";
import { requirePermission } from "@/lib/auth/require-role";

async function Queue() {
  const queue = await getApplicationQueue();
  if (queue.items.length === 0) return null;
  return <ApplicationList items={sortOldestFirst(queue.items)} hasMore={Boolean(queue.next_cursor)} />;
}

export default async function ApplicationsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("salon_application.approve");
  return (
    <>
      <TopBar title="Salon applications" subtitle="Check documents before a salon goes live" />
      <div className="grid grid-cols-[360px_minmax(0,1fr)] items-start gap-6">
        <Suspense fallback={<TableSkeleton rows={5} columns={1} />}>
          <Queue />
        </Suspense>
        <div>{children}</div>
      </div>
    </>
  );
}
