"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { StatusPill } from "@/components/sb/status-pill";
import { formatShortDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import type { ApplicationItem } from "../schemas";

/** Left card. Selection comes from the URL so shared links open the same view. */
export function ApplicationList({ items, hasMore }: { items: ApplicationItem[]; hasMore: boolean }) {
  const selected = useSelectedLayoutSegment();
  return (
    <nav aria-label="Applications to review" className="rounded-card border border-line bg-surface p-2 shadow-card">
      <ul className="space-y-1">
        {items.map((a) => {
          const active = selected === a.id;
          const submitted = `submitted ${formatShortDate(a.submitted_at)}`;
          return (
            <li key={a.id}>
              <Link
                href={`/applications/${a.id}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-input px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-amber",
                  active ? "bg-amber-surface ring-1 ring-amber-border" : "hover:bg-soft",
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="font-semibold text-text">{a.salon_name}</span>
                  <StatusPill status={a.status} />
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {a.city ? `${a.city} · ${submitted}` : submitted[0].toUpperCase() + submitted.slice(1)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <p className="px-4 py-3 text-xs text-muted-foreground">
          Showing the first {items.length}. Decide some to see the rest.
        </p>
      )}
    </nav>
  );
}
