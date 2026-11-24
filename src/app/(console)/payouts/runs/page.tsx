import Link from "next/link";
import { TopBar } from "@/components/sb/top-bar";
import { RunHistory } from "@/features/payouts/components/run-history";
import { getPayoutRuns } from "@/features/payouts/queries";
import { requirePermission } from "@/lib/auth/require-role";

export default async function PayoutRunsPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  await requirePermission("payout_run.approve");
  const { cursor } = await searchParams;
  const { items, nextCursor } = await getPayoutRuns(cursor);
  return (
    <>
      <TopBar title="Payout runs" subtitle="Weekly payouts to salons" />
      <div className="space-y-4">
        <Link href="/payouts/accounts" className="text-sm font-semibold text-amber underline-offset-4 hover:underline">
          Back to payout accounts
        </Link>
        <RunHistory runs={items} nextHref={nextCursor ? `/payouts/runs?cursor=${encodeURIComponent(nextCursor)}` : null} />
      </div>
    </>
  );
}
