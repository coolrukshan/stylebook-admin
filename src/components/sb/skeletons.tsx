import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-pill bg-soft", className)} />;
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("rounded-card border border-line bg-surface p-6 shadow-card", className)}
    >
      <Bar className="h-4 w-24" />
      <Bar className="mt-4 h-8 w-32" />
      <Bar className="mt-4 h-3 w-20" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="overflow-hidden rounded-card border border-line bg-surface shadow-card"
    >
      <div className="flex gap-4 border-b border-line px-4 py-3">
        {Array.from({ length: columns }, (_, i) => (
          <Bar key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4 border-b border-line px-4 py-4 last:border-0">
          {Array.from({ length: columns }, (_, c) => (
            <Bar key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
