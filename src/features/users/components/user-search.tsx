"use client";

import { useEffect, useRef, useState } from "react";
import { parseAsString, useQueryState } from "nuqs";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cursorsParser } from "@/lib/pagination";

export const SEARCH_DEBOUNCE_MS = 300;

/** Find user. Debounced 300 ms or Enter; the query lives in the URL (`?q=`) and is never logged. */
export function UserSearch({ shown, hasMore }: { shown: number; hasMore: boolean }) {
  const [q, setQ] = useQueryState("q", parseAsString.withDefault("").withOptions({ shallow: false }));
  const [, setCursors] = useQueryState("cursors", cursorsParser.withOptions({ shallow: false }));
  const [text, setText] = useState(q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  function commit(value: string) {
    if (timer.current) clearTimeout(timer.current);
    const next = value.trim();
    if (next === q) return;
    void setCursors(null);
    void setQ(next || null);
  }

  return (
    <div className="flex items-center justify-between gap-4 pb-4">
      <div className="relative w-96">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <Input
          type="search"
          aria-label="Find user"
          placeholder="Name, email or phone"
          className="pl-9 pr-9"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (timer.current) clearTimeout(timer.current);
            const v = e.target.value;
            timer.current = setTimeout(() => commit(v), SEARCH_DEBOUNCE_MS);
          }}
          onKeyDown={(e) => e.key === "Enter" && commit(text)}
        />
        {text && (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-subtle outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-amber"
            onClick={() => {
              setText("");
              commit("");
            }}
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {shown}
        {hasMore ? "+" : ""} shown
      </p>
    </div>
  );
}
