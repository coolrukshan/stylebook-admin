import { redirect } from "next/navigation";
import { EmptyState } from "@/components/sb/empty-state";
import { sortOldestFirst } from "@/features/applications/next-selection";
import { getApplicationQueue } from "@/features/applications/queries";

/** Selects the oldest application automatically; shows the empty state when the queue is clear. */
export default async function ApplicationsPage() {
  const queue = await getApplicationQueue();
  const first = sortOldestFirst(queue.items)[0];
  if (first) redirect(`/applications/${first.id}`);
  return (
    <div className="rounded-card border border-line bg-surface shadow-card">
      <EmptyState message="No applications to review" />
    </div>
  );
}
