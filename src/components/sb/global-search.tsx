"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Command, CommandDialog, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { SearchResultDialog } from "@/features/search/components/search-result-dialog";
import { groupResults, type SearchResult } from "@/features/search/group-results";
import { MIN_QUERY, useGlobalSearch } from "@/features/search/queries";
import { Button } from "@/components/ui/button";

const PLACEHOLDER = "Search users, salons, bookings, orders";

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

/** ⌘K / Ctrl+K / "/" palette. Server filters; the query is never logged. */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [detail, setDetail] = useState<SearchResult | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const search = useGlobalSearch(input);
  const groups = useMemo(() => groupResults(search.results), [search.results]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const close = () => {
    setOpen(false);
    setInput("");
    // Return focus to the trigger once the dialog has unmounted.
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const choose = (r: SearchResult) => {
    if (r.href) {
      router.push(r.href);
      close();
    } else {
      setOpen(false);
      setInput("");
      setDetail(r);
    }
  };

  const trimmed = input.trim();
  const idle = trimmed.length < MIN_QUERY;
  const empty = !idle && !search.isPending && !search.isError && groups.length === 0;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={PLACEHOLDER}
        className="flex h-12 w-[380px] items-center gap-3 rounded-input border border-line bg-surface px-4 text-left text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-amber"
      >
        <Search aria-hidden className="size-4" />
        {PLACEHOLDER}
      </button>
      <CommandDialog
        open={open}
        onOpenChange={(o) => (o ? setOpen(true) : close())}
        title="Global search"
        description={PLACEHOLDER}
      >
        <Command shouldFilter={false} aria-busy={search.isPending}>
          <div className="relative">
            <CommandInput value={input} onValueChange={setInput} placeholder={PLACEHOLDER} maxLength={200} />
            {search.isPending && (
              <Loader2 aria-label="Searching" className="absolute right-4 top-3 size-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <CommandList>
            {idle && <p className="py-6 text-center text-sm text-muted-foreground">Type at least {MIN_QUERY} characters</p>}
            {empty && <p role="status" className="py-6 text-center text-sm">No matches for &quot;{trimmed}&quot;</p>}
            {search.isError && (
              <div role="alert" className="flex flex-col items-center gap-2 py-6 text-sm">
                <p>Search is unavailable</p>
                <Button variant="outline" size="sm" onClick={() => search.refetch()}>Retry</Button>
              </div>
            )}
            {!idle && !search.isError && groups.map((g) => (
              <CommandGroup key={g.type} heading={g.label}>
                {g.items.map((r) => (
                  <CommandItem key={`${r.type}:${r.id}`} value={`${r.type}:${r.id}`} onSelect={() => choose(r)}>
                    <span className="rounded-pill bg-soft px-2 py-0.5 text-xs font-semibold text-text-2">{g.label.replace(/s$/, "")}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-text">{r.title}</span>
                      {r.subtitle && <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
      <SearchResultDialog result={detail} onClose={() => setDetail(null)} />
    </>
  );
}
