"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveFees } from "../actions";
import { diffFees, FEE_FIELDS, formatFee, parseField, toText, type FeeKey } from "../fields";
import type { FeeSettings } from "../schemas";
import { SaveFeesDialog } from "./save-fees-dialog";
import { Stepper } from "./stepper";
import { useUnsavedGuard } from "./use-unsaved-guard";

export const FEES_NOTE =
  "Tips always go 100% to the specialist; no commission. New commission rates apply to bookings and orders made after saving. The no-show cap applies from now on, including to existing bookings.";

type Texts = Record<FeeKey, string>;
const toTexts = (s: FeeSettings) => Object.fromEntries(FEE_FIELDS.map((f) => [f.key, toText(f, s[f.key])])) as Texts;
const signature = (s: FeeSettings) => [s.updated_at ?? "", ...FEE_FIELDS.map((f) => s[f.key])].join("|");

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section aria-labelledby="defaults-title" className="rounded-card border border-line bg-surface p-6 shadow-card">
      <h2 id="defaults-title" className="text-lg font-semibold text-text">
        Platform defaults
      </h2>
      {children}
      <p className="mt-4 text-sm text-muted-foreground">{FEES_NOTE}</p>
    </section>
  );
}

/** For admins with `fees.view` but not `fees.change`: values as text. */
export function FeeSettingsReadOnly({ settings }: { settings: FeeSettings }) {
  return (
    <Card>
      <dl className="mt-2">
        {FEE_FIELDS.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-4 border-b border-line py-4">
            <dt>
              <span className="font-semibold text-text">{f.label}</span>
              <span className="block text-sm text-muted-foreground">{f.helper}</span>
            </dt>
            <dd className="text-lg font-semibold text-text">{formatFee(f, settings[f.key])}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function FeeSettingsForm({ settings }: { settings: FeeSettings }) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => ({ base: settings, text: toTexts(settings) }));
  /** Signature of server data already handled, so a stale prop is not re-adopted after a save. */
  const [seen, setSeen] = useState(() => signature(settings));
  const [stale, setStale] = useState(false);

  const parsed = Object.fromEntries(FEE_FIELDS.map((f) => [f.key, parseField(f, draft.text[f.key])])) as Record<FeeKey, number | null>;
  const changes = diffFees(draft.base, parsed);
  const invalid = Object.values(parsed).some((v) => v === null);
  const dirty = changes.length > 0 || invalid;

  // New server data: adopt it, unless that would throw away edits (state adjusted during render).
  if (signature(settings) !== seen) {
    setSeen(signature(settings));
    if (signature(settings) !== signature(draft.base)) {
      if (dirty) setStale(true);
      else setDraft({ base: settings, text: toTexts(settings) });
    }
  }

  useUnsavedGuard(dirty);

  function reset() {
    setDraft({ base: settings, text: toTexts(settings) });
    setStale(false);
  }

  return (
    <Card>
      {stale && (
        <p role="alert" className="mt-3 rounded-input bg-warning-bg p-3 text-sm text-warning">
          Settings changed since you started. Reset to load the latest values before saving.
        </p>
      )}
      <div className="mt-2">
        {FEE_FIELDS.map((f) => (
          <Stepper
            key={f.key}
            field={f}
            text={draft.text[f.key]}
            fallback={draft.base[f.key]}
            onChange={(t) => setDraft((d) => ({ ...d, text: { ...d.text, [f.key]: t } }))}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-4">
        <SaveFeesDialog
          changes={changes}
          disabled={changes.length === 0 || invalid}
          onConfirm={async (key) => {
            const r = await saveFees(Object.fromEntries(changes.map((c) => [c.field.key, c.to])), key);
            if (r.ok) {
              setDraft({ base: r.data, text: toTexts(r.data) });
              setStale(false);
              toast.success("Fees saved");
              router.refresh();
            }
            return r;
          }}
        />
        {dirty && (
          <>
            <span role="status" className="text-sm font-semibold text-warning">
              Unsaved changes
            </span>
            <button type="button" onClick={reset} className="text-sm font-semibold text-amber underline-offset-4 hover:underline">
              Reset
            </button>
          </>
        )}
      </div>
    </Card>
  );
}
