"use client";

import { StatusPill } from "@/components/sb/status-pill";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format/date";
import { TYPE_LABELS, type SearchResult } from "../group-results";

/** Read-only summary for results with no destination page (bookings, orders). */
export function SearchResultDialog({ result, onClose }: { result: SearchResult | null; onClose: () => void }) {
  return (
    <Dialog open={result !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {result && (
          <>
            <DialogHeader>
              <DialogTitle>{result.title}</DialogTitle>
              <DialogDescription>{TYPE_LABELS[result.type].replace(/s$/, "")} · read-only summary</DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
              {result.subtitle && (<><dt className="text-muted-foreground">Details</dt><dd>{result.subtitle}</dd></>)}
              {result.status && (<><dt className="text-muted-foreground">Status</dt><dd><StatusPill status={result.status} /></dd></>)}
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDateTime(result.createdAt)}</dd>
            </dl>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
