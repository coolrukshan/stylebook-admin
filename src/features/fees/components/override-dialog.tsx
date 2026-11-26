"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useActionErrorHandler } from "@/components/sb/use-action-feedback";
import { saveOverride, searchSalons, type SalonOption } from "../actions";
import type { FeeOverride } from "../schemas";

export const SALON_SEARCH_DEBOUNCE_MS = 300;

/** Blank -> null (that rate is removed); otherwise a whole number 0-50, else undefined (invalid). */
export function parseRate(text: string): number | null | undefined {
  const t = text.trim();
  if (!t) return null;
  return /^\d{1,2}$/.test(t) && Number(t) <= 50 ? Number(t) : undefined;
}

function SalonPicker({ selected, onSelect }: { selected: SalonOption | null; onSelect: (s: SalonOption | null) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ q: string; items: SalonOption[]; error: string | null } | null>(null);
  const query = q.trim();

  useEffect(() => {
    if (query.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const r = await searchSalons(query);
      if (cancelled) return;
      setResults(
        r.ok
          ? { q: query, items: r.data, error: null }
          : { q: query, items: [], error: r.error.status === 403 ? "You can't search salons." : r.error.message },
      );
    }, SALON_SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  if (selected) {
    return (
      <p className="flex items-center justify-between text-sm">
        <span className="font-semibold text-text">{selected.name}</span>
        <button type="button" onClick={() => onSelect(null)} className="font-semibold text-amber hover:underline">
          Change salon
        </button>
      </p>
    );
  }
  const current = results && results.q === query && query.length >= 2 ? results : null;
  return (
    <div className="grid gap-1">
      <label htmlFor="override-salon" className="text-sm font-semibold text-text">
        Salon
      </label>
      <Input id="override-salon" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type at least 2 characters" />
      {current?.error && (
        <p role="alert" className="text-sm text-danger">
          {current.error}
        </p>
      )}
      {current && !current.error && current.items.length === 0 && <p className="text-sm text-muted-foreground">No salons found</p>}
      {current && current.items.length > 0 && (
        <ul aria-label="Matching salons" className="max-h-40 overflow-auto rounded-input border border-line">
          {current.items.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => onSelect(s)} className="block w-full px-3 py-2 text-left text-sm hover:bg-soft">
                {s.name}
                {s.city ? <span className="text-muted-foreground"> · {s.city}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OverrideForm({ existing, onDone }: { existing: FeeOverride | null; onDone: () => void }) {
  const [salon, setSalon] = useState<SalonOption | null>(
    existing ? { id: existing.salon_id, name: existing.salon_name, city: null } : null,
  );
  const [service, setService] = useState(existing?.service_commission_percent?.toString() ?? "");
  const [product, setProduct] = useState(existing?.product_commission_percent?.toString() ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(crypto.randomUUID());
  const handleStale = useActionErrorHandler();

  const s = parseRate(service);
  const p = parseRate(product);
  const valid = salon !== null && s !== undefined && p !== undefined && (s !== null || p !== null);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid || pending) return;
        setPending(true);
        setError(null);
        const r = await saveOverride({ salonId: salon.id, service: s, product: p }, key.current);
        setPending(false);
        if (r.ok || handleStale(r.error)) onDone();
        else setError(r.error.message);
      }}
    >
      {existing ? <p className="text-sm font-semibold text-text">{existing.salon_name}</p> : <SalonPicker selected={salon} onSelect={setSalon} />}
      {(
        [
          ["override-service", "Service commission (%)", service, setService, s],
          ["override-product", "Product commission (%)", product, setProduct, p],
        ] as const
      ).map(([id, label, value, set, parsed]) => (
        <div key={id} className="grid gap-1">
          <label htmlFor={id} className="text-sm font-semibold text-text">
            {label}
          </label>
          <Input id={id} inputMode="numeric" value={value} onChange={(e) => set(e.target.value)} aria-invalid={parsed === undefined} />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Whole numbers from 0 to 50. Leave a rate blank to use the platform default.</p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancel</DialogClose>
        <Button type="submit" disabled={!valid || pending} aria-busy={pending}>
          {pending ? "Saving…" : "Save override"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Add (existing = null) or edit an override. The form remounts on each open. */
export function OverrideDialog({ existing, trigger }: { existing: FeeOverride | null; trigger: (open: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {trigger(() => setOpen(true))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{existing ? "Edit override" : "Add override"}</DialogTitle>
            <DialogDescription>Applies immediately to this salon&apos;s new bookings and orders.</DialogDescription>
          </DialogHeader>
          <OverrideForm existing={existing} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
