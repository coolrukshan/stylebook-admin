import type { NavCount } from "@/lib/api/nav-counts";

/** Amber count badge. Hidden for zero or unknown counts (failed fetch). */
export function CountBadge({ count, label }: { count?: NavCount; label: string }) {
  if (!count || count.count === 0) return null;
  const text = count.capped ? `${count.count}+` : String(count.count);
  return (
    <span
      className="grid h-6 min-w-6 place-items-center rounded-full bg-amber px-1.5 text-xs font-bold text-white"
      aria-label={`${text} ${label}`}
    >
      {text}
    </span>
  );
}
