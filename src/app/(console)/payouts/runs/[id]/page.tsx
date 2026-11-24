import Link from "next/link";
import { TopBar } from "@/components/sb/top-bar";
import { PayoutRunCard, periodLabel } from "@/features/payouts/components/payout-run-card";
import { RunLines } from "@/features/payouts/components/run-lines";
import { getPayoutRun } from "@/features/payouts/queries";
import { requirePermission } from "@/lib/auth/require-role";

export default async function PayoutRunPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("payout_run.approve");
  const { id } = await params;
  const run = await getPayoutRun(id);
  return (
    <>
      <TopBar title="Payout run" subtitle={periodLabel(run)} />
      <div className="space-y-6">
        <Link href="/payouts/runs" className="text-sm font-semibold text-amber underline-offset-4 hover:underline">
          All payout runs
        </Link>
        <PayoutRunCard run={run} />
        <RunLines lines={run.lines} />
      </div>
    </>
  );
}
