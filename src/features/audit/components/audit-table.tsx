"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/sb/data-table";
import { formatAuditTime, formatShortDateTime } from "@/lib/format/date";
import { MONO_CLASS } from "@/lib/format/ids";
import type { AuditRow } from "../rows";

const LINK = "underline-offset-4 hover:underline";

// Append-only log: no row actions.
const columns: DataTableColumn<AuditRow>[] = [
  {
    id: "when",
    header: "When",
    cell: ({ row }) => (
      <time dateTime={row.original.at} title={formatAuditTime(row.original.at)} className="whitespace-nowrap">
        <span aria-hidden>{formatShortDateTime(row.original.at)}</span>
        <span className="sr-only">{formatAuditTime(row.original.at)}</span>
      </time>
    ),
  },
  { id: "who", header: "Who", cell: ({ row }) => <span className="whitespace-nowrap">{row.original.who}</span> },
  {
    id: "action",
    header: "Action",
    cell: ({ row }) => {
      const r = row.original;
      return (
        <div className="whitespace-normal">
          <p className="text-text">
            {r.action} ·{" "}
            {r.subjectHref ? (
              <Link href={r.subjectHref} className={`font-semibold ${LINK}`}>
                {r.subjectLabel}
              </Link>
            ) : (
              <span>{r.subjectLabel}</span>
            )}
            {r.reason && <span className="text-text-2"> (reason: {r.reason})</span>}
          </p>
          <Link href={r.historyHref} aria-label={`History of ${r.subjectLabel}`} className={`text-xs text-amber ${LINK}`}>
            History
          </Link>
        </div>
      );
    },
  },
  {
    id: "ip",
    header: "IP",
    cell: ({ row }) => <span className={`${MONO_CLASS} text-text-2`}>{row.original.ip || "-"}</span>,
  },
];

export function AuditTable({ rows, nextCursor }: { rows: AuditRow[]; nextCursor: string | null }) {
  return (
    <DataTable
      label="Audit log"
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      nextCursor={nextCursor}
      emptyMessage="No audit entries match these filters"
    />
  );
}
