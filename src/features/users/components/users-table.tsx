"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/sb/data-table";
import { StatusPill } from "@/components/sb/status-pill";
import { formatMonthYear, formatShortDate } from "@/lib/format/date";
import type { UserRow } from "../map";
import { UserActions } from "./user-actions";

/** Columns depend only on `canSuspend` (stable), so cells never remount on interaction. */
export function UsersTable({
  rows,
  nextCursor,
  canSuspend,
  query,
}: {
  rows: UserRow[];
  nextCursor: string | null;
  canSuspend: boolean;
  query: string;
}) {
  const columns = useMemo<DataTableColumn<UserRow>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        cell: ({ row }) => (
          <div>
            <Link href={`/users/${row.original.id}`} className="font-semibold text-text underline-offset-4 hover:underline">
              {row.original.name}
            </Link>
            {row.original.status === "suspended" && row.original.suspendedAt && (
              <p className="text-xs text-muted-foreground">Suspended {formatShortDate(row.original.suspendedAt)}</p>
            )}
          </div>
        ),
      },
      {
        id: "contact",
        header: "Email · phone",
        cell: ({ row }) => (
          <div className="font-mono text-xs text-text-2">
            <p>{row.original.emailMasked || "-"}</p>
            <p>{row.original.phoneMasked || "-"}</p>
          </div>
        ),
      },
      { id: "type", header: "Type", cell: ({ row }) => row.original.roleLabel },
      { id: "bookings", header: "Bookings", cell: ({ row }) => row.original.bookings },
      {
        id: "joined",
        header: "Joined",
        cell: ({ row }) => <span className="whitespace-nowrap">{formatMonthYear(row.original.joinedAt)}</span>,
      },
      { id: "status", header: "Status", cell: ({ row }) => <StatusPill status={row.original.status} /> },
      {
        id: "action",
        header: "Action",
        cell: ({ row }) =>
          canSuspend && row.original.canAct ? (
            <UserActions id={row.original.id} name={row.original.name} status={row.original.status} />
          ) : null,
      },
    ],
    [canSuspend],
  );

  return (
    <DataTable
      label="Users"
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      nextCursor={nextCursor}
      emptyMessage={query ? `No users match "${query}"` : "No users yet"}
      clearFiltersHref={undefined}
    />
  );
}
