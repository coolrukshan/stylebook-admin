"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useActionErrorHandler } from "@/components/sb/use-action-feedback";
import type { ActionResult } from "@/lib/api/errors";
import { formatFee, type FeeChange } from "../fields";

/** Old -> new confirmation. No reason field: the API does not accept one. */
export function SaveFeesDialog({
  changes,
  disabled,
  onConfirm,
}: {
  changes: FeeChange[];
  disabled: boolean;
  onConfirm: (idempotencyKey: string) => Promise<ActionResult<unknown>>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef("");
  const busy = useRef(false);
  const handleStale = useActionErrorHandler();

  async function confirm() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const r = await onConfirm(key.current);
      if (r.ok || handleStale(r.error)) setOpen(false);
      else setError(r.error.message);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        disabled={disabled}
        className="h-11 rounded-pill px-6"
        onClick={() => {
          key.current = crypto.randomUUID();
          setError(null);
          setOpen(true);
        }}
      >
        Save changes
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Save fee changes?</DialogTitle>
            <DialogDescription>Takes effect immediately. Salons are not notified by this action.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {changes.map((c) => (
              <li key={c.field.key} className="flex justify-between gap-4">
                <span className="text-text-2">{c.field.label}</span>
                <span className="whitespace-nowrap font-semibold text-text">
                  {formatFee(c.field, c.from)} → {formatFee(c.field, c.to)}
                </span>
              </li>
            ))}
          </ul>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancel</DialogClose>
            <Button type="button" disabled={pending} aria-busy={pending} onClick={() => void confirm()}>
              {pending ? "Saving…" : "Confirm and save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
