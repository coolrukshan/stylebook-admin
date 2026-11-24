import Link from "next/link";
import { cn } from "@/lib/utils";
import type { StatusFilter } from "../map";

const ITEMS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

export function UserFilters({ current, q }: { current: StatusFilter; q: string }) {
  return (
    <nav aria-label="Filter by status" className="flex gap-2 pb-4">
      {ITEMS.map((i) => {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (i.value !== "all") params.set("status", i.value);
        const qs = params.toString();
        return (
          <Link
            key={i.value}
            href={qs ? `/users?${qs}` : "/users"}
            aria-current={current === i.value ? "page" : undefined}
            className={cn(
              "rounded-pill border px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber",
              current === i.value ? "border-ink bg-ink font-semibold text-white" : "border-line-strong bg-surface text-text-2 hover:bg-soft",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
