/** KPI card. `value` is a pre-formatted string; the console never computes totals. */
export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-6 shadow-card">
      <p className="text-sm text-text-2">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-text">{value}</p>
      {hint && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
