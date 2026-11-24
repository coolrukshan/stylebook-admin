import Link from "next/link";
import { Suspense } from "react";
import { SectionBoundary } from "@/components/sb/section-boundary";
import { CardSkeleton, TableSkeleton } from "@/components/sb/skeletons";
import { TopBar } from "@/components/sb/top-bar";
import { DisputesTable, type DisputeRow } from "@/features/disputes/components/disputes-table";
import { StatCards } from "@/features/disputes/components/stat-cards";
import { getDisputes, getParties } from "@/features/disputes/queries";
import { disputeState, hoursLeft, parseView, salonReply, shortId, VIEWS, type View } from "@/features/disputes/status";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-role";
import { formatRelative } from "@/lib/format/date";
import { cn } from "@/lib/utils";

type SP = Promise<Record<string, string | string[] | undefined>>;
const LABEL: Record<View, string> = { active: "Active", decided: "Decided" };

async function Results({ view, canDecide }: { view: View; canDecide: boolean }) {
  const { items, hasMore } = await getDisputes(view);
  const parties = await getParties(items.map((d) => d.user_id), items.map((d) => d.salon_id));
  const now = new Date();
  const rows: DisputeRow[] = items.map((d) => ({
    id: d.id,
    code: shortId(d.id),
    openedLabel: `Opened ${formatRelative(d.created_at, now)}`,
    client: parties.clients.get(d.user_id) ?? "Unknown",
    salon: parties.salons.get(d.salon_id) ?? "Unknown salon",
    issue: d.reason,
    category: d.category,
    offeredCents: d.offer_refund ? d.offered_refund_cents : null,
    reply: salonReply(d, now),
    status: d.status,
    state: disputeState(d),
    hoursLeft: hoursLeft(d.salon_deadline, now),
  }));
  return (
    <>
      <DisputesTable rows={rows} canDecide={canDecide} />
      {hasMore && <p className="mt-2 text-xs text-muted-foreground">Showing the first {rows.length}. Decide some to see the rest.</p>}
    </>
  );
}

export default async function DisputesPage({ searchParams }: { searchParams: SP }) {
  const me = await requirePermission("dispute.decide");
  const view = parseView((await searchParams).view);
  return (
    <>
      <TopBar title="Disputes and refunds" subtitle="Escalated after 48 hours or by the client" />
      <div className="space-y-6">
        <p className="max-w-3xl text-text-2">
          Clients raise a problem from the receipt. The salon has 48 hours to answer; after that, or if the client escalates, it lands here.
          Refunds go back to the original payment method.
        </p>
        <nav aria-label="Filter disputes" className="flex gap-2">
          {VIEWS.map((v) => (
            <Link
              key={v}
              href={v === "active" ? "/disputes" : `/disputes?view=${v}`}
              aria-current={view === v ? "page" : undefined}
              className={cn(
                "rounded-pill border px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber",
                view === v ? "border-ink bg-ink font-semibold text-white" : "border-line-strong bg-surface text-text-2 hover:bg-soft",
              )}
            >
              {LABEL[v]}
            </Link>
          ))}
        </nav>
        <SectionBoundary title="Couldn't load disputes">
          <Suspense fallback={<TableSkeleton columns={7} />}>
            <Results view={view} canDecide={hasPermission(me, "dispute.decide")} />
          </Suspense>
        </SectionBoundary>
        <SectionBoundary title="Couldn't load stats">
          <Suspense fallback={<CardSkeleton />}>
            <StatCards />
          </Suspense>
        </SectionBoundary>
      </div>
    </>
  );
}
