import { Suspense } from "react";
import { SectionBoundary } from "@/components/sb/section-boundary";
import { CardSkeleton, TableSkeleton } from "@/components/sb/skeletons";
import { TopBar } from "@/components/sb/top-bar";
import { parseFilter } from "@/features/payouts/account-status";
import { AccountFilters } from "@/features/payouts/components/account-filters";
import { AccountsTable } from "@/features/payouts/components/accounts-table";
import { PayoutRunCard } from "@/features/payouts/components/payout-run-card";
import { getLatestPayoutRun, getPayoutAccounts } from "@/features/payouts/queries";
import { sortQueue } from "@/features/payouts/account-status";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-role";

type SP = Promise<Record<string, string | string[] | undefined>>;

async function Accounts({ searchParams, me }: { searchParams: SP; me: Awaited<ReturnType<typeof requirePermission>> }) {
  const sp = await searchParams;
  const filter = parseFilter(sp.status);
  const raw = Array.isArray(sp.cursors) ? sp.cursors.join(",") : sp.cursors;
  // Last entry of the `cursors` stack (not importing lib/pagination: it pulls nuqs client code).
  const cursor = raw?.split(",").filter(Boolean).at(-1);
  const { items, nextCursor } = await getPayoutAccounts(filter, cursor);
  return (
    <>
      <AccountFilters current={filter} />
      <AccountsTable
        accounts={sortQueue(items)}
        nextCursor={nextCursor}
        canReveal={hasPermission(me, "bank_account.reveal")}
        canVerify={hasPermission(me, "payout_account.verify")}
        filtered={filter !== "all"}
      />
    </>
  );
}

async function RunCard() {
  return <PayoutRunCard run={await getLatestPayoutRun()} />;
}

export default async function PayoutAccountsPage({ searchParams }: { searchParams: SP }) {
  const me = await requirePermission("payout_account.verify");
  return (
    <>
      <TopBar title="Payout accounts" subtitle="Verify where salons get paid" />
      <div className="space-y-6">
        <SectionBoundary title="Couldn't load payout accounts">
          <Suspense fallback={<TableSkeleton />}>
            <Accounts searchParams={searchParams} me={me} />
          </Suspense>
        </SectionBoundary>
        <p className="text-sm text-muted-foreground">
          Account numbers are stored encrypted. Only finance and super admins can reveal them, and every reveal is written to the audit
          log. When a salon changes its bank details, its payouts are held until an admin verifies the new account.
        </p>
        {hasPermission(me, "payout_run.approve") && (
          <SectionBoundary title="Couldn't load the payout run">
            <Suspense fallback={<CardSkeleton className="h-64" />}>
              <RunCard />
            </Suspense>
          </SectionBoundary>
        )}
      </div>
    </>
  );
}
