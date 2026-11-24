"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DataTable,
  rowActionLabel,
  type DataTableColumn,
} from "@/components/sb/data-table";
import { MaskedValue } from "@/components/sb/masked-value";
import { ReasonDialog } from "@/components/sb/reason-dialog";
import { reasonDialogs } from "@/components/sb/reason-presets";
import { StatusPill } from "@/components/sb/status-pill";
import { useActionErrorHandler } from "@/components/sb/use-action-feedback";
import { Button } from "@/components/ui/button";
import { TASK_COUNTS_KEY } from "@/features/dashboard/use-task-counts";
import { formatShortDate } from "@/lib/format/date";
import { accountStatus, maskAccount } from "../account-status";
import {
  rejectPayoutAccount,
  revealPayoutAccount,
  verifyPayoutAccount,
} from "../actions";
import type { PayoutAccount } from "../schemas";

type RevealState = [
  string | null,
  React.Dispatch<React.SetStateAction<string | null>>,
];
/** Which row is revealed. A context (not a column dependency) so cells keep their identity. */
const RevealContext = createContext<RevealState>([null, () => {}]);

function RevealCell({
  account,
  canReveal,
}: {
  account: PayoutAccount;
  canReveal: boolean;
}) {
  const [active, setActive] = useContext(RevealContext);
  return (
    <MaskedValue
      masked={maskAccount(account.account_last4)}
      label="account number"
      subject={account.salon_name ?? "salon"}
      reveal={canReveal ? () => revealPayoutAccount(account.id) : undefined}
      revealKey={account.id}
      activeKey={active}
      onActiveChange={setActive}
    />
  );
}

function subLine(a: PayoutAccount): string {
  const s = accountStatus(a);
  if (s === "verified")
    return a.verified_at
      ? `Verified ${formatShortDate(a.verified_at)}`
      : "Verified";
  if (s === "rejected")
    return a.rejected_at
      ? `Rejected ${formatShortDate(a.rejected_at)}`
      : "Rejected";
  return a.created_at
    ? `Submitted ${formatShortDate(a.created_at)}`
    : "Awaiting verification";
}

function VerifyButton({ account }: { account: PayoutAccount }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const handleStale = useActionErrorHandler();
  const [pending, start] = useTransition();
  const key = useRef(crypto.randomUUID());
  const name = account.salon_name ?? "salon";
  return (
    <Button
      disabled={pending}
      aria-busy={pending}
      aria-label={rowActionLabel("Verify", name)}
      className="rounded-pill bg-success px-4 text-white hover:bg-success/90"
      onClick={() =>
        start(async () => {
          const r = await verifyPayoutAccount(account.id, key.current);
          if (r.ok) {
            toast.success(`Verified account for ${name}`);
            void queryClient.invalidateQueries({ queryKey: TASK_COUNTS_KEY });
            router.refresh();
          } else if (!handleStale(r.error)) toast.error(r.error.message);
        })
      }
    >
      Verify
    </Button>
  );
}

function RejectButton({ account }: { account: PayoutAccount }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const name = account.salon_name ?? "salon";
  return (
    <ReasonDialog
      {...reasonDialogs.rejectPayoutAccount(name)}
      onConfirm={async (reason, key) => {
        const r = await rejectPayoutAccount(account.id, reason, key);
        if (r.ok) {
          toast.success(`Rejected account for ${name}`);
          void queryClient.invalidateQueries({ queryKey: TASK_COUNTS_KEY });
          router.refresh();
        }
        return r;
      }}
      trigger={
        <Button
          variant="outline"
          aria-label={rowActionLabel("Reject", name)}
          className="rounded-pill border-danger px-4 text-danger"
        >
          Reject
        </Button>
      }
    />
  );
}

export function AccountsTable({
  accounts,
  nextCursor,
  canReveal,
  canVerify,
  filtered,
}: {
  accounts: PayoutAccount[];
  nextCursor: string | null;
  canReveal: boolean;
  canVerify: boolean;
  filtered: boolean;
}) {
  const reveal = useState<string | null>(null);

  const columns = useMemo<DataTableColumn<PayoutAccount>[]>(
    () => [
      {
        id: "salon",
        header: "Salon",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-text">
              {row.original.salon_name ?? "Unknown salon"}
            </p>
            <p className="text-xs text-muted-foreground">
              {subLine(row.original)}
            </p>
          </div>
        ),
      },
      {
        id: "bank",
        header: "Bank · branch",
        cell: ({ row }) =>
          [row.original.bank_name, row.original.branch]
            .filter(Boolean)
            .join(" · "),
      },
      {
        id: "holder",
        header: "Account holder",
        cell: ({ row }) => row.original.account_name,
      },
      {
        id: "number",
        header: "Account number",
        cell: ({ row }) => (
          <RevealCell account={row.original} canReveal={canReveal} />
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusPill status={accountStatus(row.original)} />,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) =>
          canVerify && accountStatus(row.original) === "pending" ? (
            <div className="flex gap-2">
              <VerifyButton account={row.original} />
              <RejectButton account={row.original} />
            </div>
          ) : null,
      },
    ],
    [canReveal, canVerify],
  );

  return (
    <RevealContext.Provider value={reveal}>
      <DataTable
        label="Payout accounts"
        columns={columns}
        data={accounts}
        getRowId={(a) => a.id}
        nextCursor={nextCursor}
        emptyMessage="No payout accounts need attention"
        clearFiltersHref={filtered ? "/payouts/accounts?status=all" : undefined}
      />
    </RevealContext.Provider>
  );
}
