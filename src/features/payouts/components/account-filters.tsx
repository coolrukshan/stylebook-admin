import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AccountFilter } from "../account-status";

const ITEMS: { value: AccountFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

export function AccountFilters({ current }: { current: AccountFilter }) {
  return (
    <nav aria-label="Filter by status" className="flex gap-2 pb-4">
      {ITEMS.map((i) => (
        <Link
          key={i.value}
          href={`/payouts/accounts?status=${i.value}`}
          aria-current={current === i.value ? "page" : undefined}
          className={cn(
            "rounded-pill border px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber",
            current === i.value ? "border-ink bg-ink font-semibold text-white" : "border-line-strong bg-surface text-text-2 hover:bg-soft",
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
