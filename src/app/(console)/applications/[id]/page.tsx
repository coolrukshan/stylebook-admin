import { ApplicationDetail } from "@/features/applications/components/application-detail";
import { nextSelection, sortOldestFirst } from "@/features/applications/next-selection";
import { getApplication, getApplicationQueue } from "@/features/applications/queries";

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [app, queue] = await Promise.all([getApplication(id), getApplicationQueue().catch(() => null)]);
  const ids = sortOldestFirst(queue?.items ?? []).map((a) => a.id);
  return <ApplicationDetail app={app} nextId={nextSelection(ids, id)} />;
}
