/** "DEMO DATA" / "STAGING" from NEXT_PUBLIC_ENV_LABEL. Renders nothing in prod. */
export function EnvBadge({ label = process.env.NEXT_PUBLIC_ENV_LABEL }: { label?: string }) {
  const text = label?.trim();
  if (!text) return null;
  return (
    <span className="rounded-pill bg-warning-bg px-3 py-2 text-xs font-bold uppercase tracking-wide text-warning">
      {text}
    </span>
  );
}
