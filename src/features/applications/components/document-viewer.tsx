"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ViewerItem = { index: number; label: string };

/**
 * Opens documents from the server proxy (`/api/applications/..`), never from
 * the storage URL. Arrow keys move through a gallery; each file loads only
 * when its tile is activated.
 */
export function DocumentTile({
  applicationId,
  label,
  state,
  items,
}: {
  applicationId: string;
  label: string;
  state: "received" | "missing";
  items: ViewerItem[];
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [attempt, setAttempt] = useState(0);
  const received = state === "received";
  const current = items[pos];

  const move = useCallback(
    (d: number) => setPos((p) => Math.min(items.length - 1, Math.max(0, p + d))),
    [items.length],
  );
  const body = (
    <>
      {received ? (
        <CheckCircle2 aria-hidden className="size-4 text-success" />
      ) : (
        <XCircle aria-hidden className="size-4 text-danger" />
      )}
      <span className="min-w-0 flex-1 text-left text-sm font-medium text-text">{label}</span>
      <span className={cn("text-xs font-semibold", received ? "text-success" : "text-danger")}>
        {received ? "Received" : "Missing"}
      </span>
    </>
  );
  const base = "flex items-center gap-2 rounded-input border border-line px-3 py-3";

  if (!received) return <div className={cn(base, "bg-danger-bg/40")}>{body}</div>;

  const src = current ? `/api/applications/${applicationId}/documents/${current.index}` : "";
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPos(0);
          setOpen(true);
        }}
        aria-label={`Open ${label}`}
        className={cn(base, "w-full bg-surface outline-none hover:bg-soft focus-visible:ring-2 focus-visible:ring-amber")}
      >
        {body}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-3xl"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") move(1);
            if (e.key === "ArrowLeft") move(-1);
          }}
        >
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            {items.length > 1 ? `${label.replace(/ \(\d+\)$/, "")} ${pos + 1} of ${items.length}` : "Sensitive document. Do not share."}
          </DialogDescription>
          <div className="grid min-h-64 place-items-center rounded-input bg-soft">
            {failed[current.index] ? (
              <div className="grid gap-2 p-6 text-center text-sm text-muted-foreground">
                <p>Couldn&apos;t load this file.</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFailed((f) => ({ ...f, [current.index]: false }));
                    setAttempt((n) => n + 1);
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${current.index}-${attempt}`}
                src={src}
                alt={items.length > 1 ? `Photo ${pos + 1} of ${items.length}` : label}
                onError={() => setFailed((f) => ({ ...f, [current.index]: true }))}
                className="max-h-[70vh] w-auto max-w-full rounded-input object-contain"
              />
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <a href={src} target="_blank" rel="noreferrer" className="text-sm font-semibold text-amber underline-offset-4 hover:underline">
              Open in new tab (PDF)
            </a>
            {items.length > 1 && (
              <div className="flex gap-2">
                <Button variant="outline" size="icon" aria-label="Previous photo" disabled={pos === 0} onClick={() => move(-1)}>
                  <ChevronLeft aria-hidden />
                </Button>
                <Button variant="outline" size="icon" aria-label="Next photo" disabled={pos === items.length - 1} onClick={() => move(1)}>
                  <ChevronRight aria-hidden />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
