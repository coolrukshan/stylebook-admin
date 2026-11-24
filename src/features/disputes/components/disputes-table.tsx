"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/sb/data-table";
import { StatusPill } from "@/components/sb/status-pill";
import { formatLkr } from "@/lib/format/money";
import type { DisputeState, SalonReply } from "../status";
import { DecisionButtons } from "./decision-buttons";

/** Everything pre-resolved on the server, so the client holds no clock and no raw API payload. */
export type DisputeRow = {
  id: string;
  code: string;
  openedLabel: string;
  client: string;
  salon: string;
  issue: string;
  category: string;
  offeredCents: number | null;
  reply: SalonReply;
  status: string;
  state: DisputeState;
  hoursLeft: number;
};

function ReplyCell({ reply, id }: { reply: SalonReply; id: string }) {
  if (reply.kind === "none_after_48h") return <span className="font-medium text-danger">No reply after 48 h</span>;
  if (reply.kind === "waiting") return <span className="text-muted-foreground">Waiting</span>;
  const long = reply.text.length > 100;
  return (
    <span className="text-text-2">
      &ldquo;{long ? `${reply.text.slice(0, 100).trimEnd()}…` : reply.text}&rdquo;
      {long && (
        <Link href={`/disputes/${id}`} className="ml-1 font-semibold text-amber underline-offset-4 hover:underline">
          Read more
        </Link>
      )}
    </span>
  );
}

export function DisputesTable({ rows, canDecide }: { rows: DisputeRow[]; canDecide: boolean }) {
  const columns = useMemo<DataTableColumn<DisputeRow>[]>(
    () => [
      {
        id: "case",
        header: "Case",
        cell: ({ row }) => (
          <div>
            <Link href={`/disputes/${row.original.id}`} className="font-mono text-sm font-semibold text-text underline-offset-4 hover:underline">
              {row.original.code}
            </Link>
            <p className="text-xs text-muted-foreground">{row.original.openedLabel}</p>
          </div>
        ),
      },
      {
        id: "parties",
        header: "Client · salon",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-text">{row.original.client}</p>
            <p className="text-xs text-muted-foreground">{row.original.salon}</p>
          </div>
        ),
      },
      {
        id: "issue",
        header: "Issue",
        cell: ({ row }) => (
          <div className="max-w-xs">
            <p className="line-clamp-3 text-sm text-text-2">{row.original.issue}</p>
            <p className="mt-1 text-xs text-muted-foreground">{row.original.category.replace(/_/g, " ")}</p>
          </div>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <p>-</p>
            {row.original.offeredCents ? (
              <p className="text-xs text-muted-foreground">Offered {formatLkr(row.original.offeredCents)}</p>
            ) : null}
          </div>
        ),
      },
      { id: "reply", header: "Salon reply", cell: ({ row }) => <ReplyCell reply={row.original.reply} id={row.original.id} /> },
      { id: "status", header: "Status", cell: ({ row }) => <StatusPill status={row.original.status} /> },
      {
        id: "decision",
        header: "Decision",
        cell: ({ row }) => (
          <DecisionButtons
            id={row.original.id}
            code={row.original.code}
            state={row.original.state}
            hoursLeft={row.original.hoursLeft}
            canDecide={canDecide}
          />
        ),
      },
    ],
    [canDecide],
  );
  return (
    <DataTable label="Disputes" columns={columns} data={rows} getRowId={(r) => r.id} nextCursor={null} emptyMessage="No disputes need a decision" />
  );
}
