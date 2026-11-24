import { Sparkles } from "lucide-react";

/** Advisory only; the console never overrides it. The API has no AI check yet. */
export function AiCheckPanel({ summary }: { summary: string | null }) {
  return (
    <section aria-labelledby="ai-check" className="rounded-input border border-amber-border bg-amber-surface p-4">
      <h3 id="ai-check" className="flex items-center gap-2 text-xs font-bold tracking-wide text-amber-dark">
        <Sparkles aria-hidden className="size-3.5" />
        AI DOCUMENT CHECK
      </h3>
      <p className="mt-2 text-sm text-text-2">{summary ?? "AI check not available yet. Review the documents yourself."}</p>
    </section>
  );
}
