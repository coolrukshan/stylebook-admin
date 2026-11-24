"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/api/errors";
import { MONO_CLASS } from "@/lib/format/ids";
import { cn } from "@/lib/utils";

export const REVEAL_TIMEOUT_MS = 60_000;

type Props = {
  /** Already-masked value from the API or server (e.g. "•••• •••• 4821"). */
  masked: string;
  /** What is being revealed, e.g. "account number". */
  label: string;
  /** Row subject for the accessible name, e.g. "RedBox Barber". */
  subject: string;
  /** Audited reveal. A Server Action bound to the record id and reason. Omit for masked-only values (email/phone). */
  reveal?: () => Promise<ActionResult<string>>;
  mono?: boolean;
  /**
   * Optional "one revealed at a time" coordination. Give every row a unique
   * `revealKey`, and share one `useState<string | null>` as activeKey /
   * onActiveChange (the setter). Revealing another row hides this one.
   */
  revealKey?: string;
  activeKey?: string | null;
  onActiveChange?: (update: (current: string | null) => string | null) => void;
};

/**
 * The revealed value lives in component state only: never in the URL, a cache,
 * logs or storage. It is dropped on Hide, after 60 s, on navigation and on
 * unmount. Reveal itself is an audited API call, never a client-side unmask.
 */
export function MaskedValue({ masked, label, subject, reveal, mono = true, revealKey, activeKey, onActiveChange }: Props) {
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setValue(null);
    if (revealKey) onActiveChange?.((cur) => (cur === revealKey ? null : cur));
  }, [revealKey, onActiveChange]);

  // Hide on navigation (state adjusted during render, not in an effect).
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setValue(null);
  }
  // Another row became the revealed one: drop this value.
  if (revealKey && value !== null && activeKey !== undefined && activeKey !== revealKey) {
    setValue(null);
  }
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function onReveal() {
    if (!reveal || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await reveal();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setValue(result.data);
      if (revealKey) onActiveChange?.(() => revealKey);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(hide, REVEAL_TIMEOUT_MS);
    });
  }

  const shown = value !== null;
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn(mono && MONO_CLASS)} data-revealed={shown}>
        {shown ? value : masked}
      </span>
      {reveal && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={shown ? hide : onReveal}
          aria-label={`${shown ? "Hide" : "Reveal"} ${label} for ${subject}`}
        >
          {shown ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          {shown ? "Hide" : "Reveal"}
        </Button>
      )}
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
