"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { ReasonDialog } from "@/components/sb/reason-dialog";
import { reasonDialogs } from "@/components/sb/reason-presets";
import { Button } from "@/components/ui/button";
import { resetHoldout } from "../actions";
import { HOLDOUT_DEFAULT, HOLDOUT_MAX, HOLDOUT_MIN } from "../schemas";

const int = new Intl.NumberFormat("en-US");
const BTN =
  "grid size-9 place-items-center rounded-input border border-line-strong outline-none hover:bg-soft focus-visible:ring-2 focus-visible:ring-amber disabled:cursor-not-allowed disabled:opacity-40";

export function parsePercentage(text: string): number | null {
  const n = /^\d{1,2}$/.test(text.trim()) ? Number(text) : NaN;
  return n >= HOLDOUT_MIN && n <= HOLDOUT_MAX ? n : null;
}

/** Starts at the default because the API cannot tell us the current percentage. */
export function HoldoutReset() {
  const router = useRouter();
  const [text, setText] = useState(String(HOLDOUT_DEFAULT));
  const value = parsePercentage(text);
  const current = value ?? HOLDOUT_DEFAULT;
  const step = (d: 1 | -1) => setText(String(Math.max(HOLDOUT_MIN, Math.min(HOLDOUT_MAX, current + d))));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label htmlFor="holdout-pct" className="text-sm text-text-2">
          New holdout percentage
        </label>
        <button type="button" className={BTN} aria-label="Decrease holdout percentage" disabled={current <= HOLDOUT_MIN} onClick={() => step(-1)}>
          <Minus aria-hidden className="size-4" />
        </button>
        <input
          id="holdout-pct"
          inputMode="numeric"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-invalid={value === null}
          aria-describedby={value === null ? "holdout-error" : undefined}
          className="w-14 rounded-input border border-line-strong bg-surface py-1 text-center font-semibold outline-none focus-visible:ring-2 focus-visible:ring-amber aria-invalid:border-danger"
        />
        <span aria-hidden>%</span>
        <button type="button" className={BTN} aria-label="Increase holdout percentage" disabled={current >= HOLDOUT_MAX} onClick={() => step(1)}>
          <Plus aria-hidden className="size-4" />
        </button>
        <ReasonDialog
          {...reasonDialogs.resetHoldout(current)}
          onConfirm={async (reason, key) => {
            const r = await resetHoldout(current, reason, key);
            if (r.ok) {
              toast.success(
                `Holdout reset: ${int.format(r.data.previous_holdout_size)} → ${int.format(r.data.new_holdout_size)} clients`,
              );
              router.refresh();
            }
            return r;
          }}
          trigger={
            <Button variant="outline" disabled={value === null} className="rounded-pill border-danger px-4 text-danger">
              Reset holdout group
            </Button>
          }
        />
      </div>
      {value === null && (
        <p id="holdout-error" role="alert" className="text-right text-sm text-danger">
          Enter a whole number from {HOLDOUT_MIN} to {HOLDOUT_MAX}.
        </p>
      )}
    </div>
  );
}
