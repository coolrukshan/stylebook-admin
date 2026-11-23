"use client";

import {
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cursorsParser, popCursor, pushCursor } from "@/lib/pagination";
import { EmptyState } from "./empty-state";

// Module scope: Table v9 needs stable features/columns/data references.
const features = tableFeatures({});
export type DataTableColumn<TData extends RowData> = ColumnDef<typeof features, TData>;

/** Accessible name for a row action: "Reveal account number for RedBox Barber". */
export const rowActionLabel = (action: string, subject: string) => `${action} for ${subject}`;

type Props<TData extends RowData> = {
  /** Describes the table for assistive tech. */
  label: string;
  columns: DataTableColumn<TData>[];
  data: TData[];
  getRowId?: (row: TData) => string;
  /** `next_cursor` from the API page; null/undefined when on the last page. */
  nextCursor?: string | null;
  emptyMessage: string;
  /** Set when filters are active so an empty table shows "No results". */
  clearFiltersHref?: string;
};

/**
 * Presentational table. Data is fetched server-side (RSC) and passed in; paging
 * is cursor based and lives in the URL via nuqs (`cursors`), so the server page
 * re-renders on navigation. No client-side sorting or totals.
 */
export function DataTable<TData extends RowData>({
  label,
  columns,
  data,
  getRowId,
  nextCursor,
  emptyMessage,
  clearFiltersHref,
}: Props<TData>) {
  const [cursors, setCursors] = useQueryState("cursors", cursorsParser.withOptions({ shallow: false }));
  const table = useTable({ features, columns, data, getRowId });
  const rows = table.getRowModel().rows;

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div className="max-h-[calc(100vh-280px)] overflow-auto">
        <Table aria-label={label}>
          <TableHeader className="sticky top-0 z-10 bg-surface">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id} className="px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id} className="px-4 py-3">
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length === 0 && <EmptyState message={emptyMessage} clearHref={clearFiltersHref} />}
      </div>
      {(cursors.length > 0 || nextCursor) && (
        <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
          <Button variant="outline" disabled={cursors.length === 0} onClick={() => setCursors(popCursor(cursors))}>
            Previous
          </Button>
          <Button variant="outline" disabled={!nextCursor} onClick={() => nextCursor && setCursors(pushCursor(cursors, nextCursor))}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
