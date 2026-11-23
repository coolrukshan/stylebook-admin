import Link from "next/link";
import { Inbox } from "lucide-react";

/**
 * Friendly empty line. Pass `clearHref` when filters are active to show
 * "No results" with a clear-filters link instead of the empty message.
 */
export function EmptyState({
  message,
  clearHref,
}: {
  message: string;
  clearHref?: string;
}) {
  return (
    <div role="status" className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <Inbox aria-hidden className="size-8 text-subtle" />
      <p className="font-medium text-text">{clearHref ? "No results" : message}</p>
      {clearHref && (
        <Link href={clearHref} className="text-sm font-semibold text-amber underline-offset-4 hover:underline">
          Clear filters
        </Link>
      )}
    </div>
  );
}
