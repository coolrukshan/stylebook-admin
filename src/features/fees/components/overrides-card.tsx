"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useActionErrorHandler } from "@/components/sb/use-action-feedback";
import { formatPercent } from "@/lib/format/percent";
import { removeOverride } from "../actions";
import type { FeeOverride } from "../schemas";
import { OverrideDialog } from "./override-dialog";

export function overrideRates(o: FeeOverride): string {
  return [
    o.service_commission_percent != null && `${formatPercent(o.service_commission_percent)} services`,
    o.product_commission_percent != null && `${formatPercent(o.product_commission_percent)} products`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function RemoveButton({ override }: { override: FeeOverride }) {
  const router = useRouter();
  const handleStale = useActionErrorHandler();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef("");
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Remove override for ${override.salon_name}`}
        onClick={() => {
          key.current = crypto.randomUUID();
          setError(null);
          setOpen(true);
        }}
      >
        Remove
      </Button>
      <Dialog open={open} onOpenChange={(n) => !pending && setOpen(n)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Remove override?</DialogTitle>
            <DialogDescription>{override.salon_name} goes back to the platform defaults for new bookings and orders.</DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancel</DialogClose>
            <Button
              disabled={pending}
              aria-busy={pending}
              className="bg-danger text-white hover:bg-danger/90"
              onClick={async () => {
                if (pending) return;
                setPending(true);
                const r = await removeOverride(override.id, key.current);
                setPending(false);
                if (r.ok) {
                  setOpen(false);
                  toast.success(`Override removed for ${override.salon_name}`);
                  router.refresh();
                } else if (handleStale(r.error)) setOpen(false);
                else setError(r.error.message);
              }}
            >
              Remove override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function OverridesCard({
  overrides,
  canChange,
  canSearchSalons,
  mayHaveMore,
}: {
  overrides: FeeOverride[];
  canChange: boolean;
  canSearchSalons: boolean;
  mayHaveMore: boolean;
}) {
  return (
    <section aria-labelledby="overrides-title" className="rounded-card border border-line bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <h2 id="overrides-title" className="text-lg font-semibold text-text">
          Salon overrides
        </h2>
        {canChange && (
          <OverrideDialog
            existing={null}
            trigger={(open) => (
              <Button variant="outline" disabled={!canSearchSalons} onClick={open}>
                Add override
              </Button>
            )}
          />
        )}
      </div>
      {canChange && !canSearchSalons && (
        <p className="mt-2 text-xs text-muted-foreground">You can&apos;t search salons, so new overrides can&apos;t be added.</p>
      )}
      {overrides.length === 0 ? (
        <p role="status" className="py-4 text-sm text-muted-foreground">
          No salon overrides
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {overrides.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-text">{o.salon_name}</p>
                <p className="text-sm font-semibold text-text">{overrideRates(o)}</p>
              </div>
              {canChange && (
                <div className="flex gap-1">
                  <OverrideDialog
                    existing={o}
                    trigger={(open) => (
                      <Button variant="ghost" size="sm" aria-label={`Edit override for ${o.salon_name}`} onClick={open}>
                        Edit
                      </Button>
                    )}
                  />
                  <RemoveButton override={o} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Overrides have no end date; remove them when they expire.
        {mayHaveMore ? " Showing the first 50." : ""}
      </p>
    </section>
  );
}
