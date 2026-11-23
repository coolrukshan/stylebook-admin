"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandInput, CommandList } from "@/components/ui/command";

/**
 * Shell only: trigger + palette frame. Search logic and results belong to
 * spec 01. Do not log the query (it may contain PII).
 */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search users, salons, bookings, orders"
        className="flex h-12 w-[380px] items-center gap-3 rounded-input border border-line bg-surface px-4 text-left text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-amber"
      >
        <Search aria-hidden className="size-4" />
        Search users, salons, bookings, orders
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Global search" description="Search users, salons, bookings, orders">
        <CommandInput placeholder="Search users, salons, bookings, orders" />
        <CommandList>
          <CommandEmpty>Type to search.</CommandEmpty>
        </CommandList>
      </CommandDialog>
    </>
  );
}
