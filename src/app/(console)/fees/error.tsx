"use client";

import { ErrorCard } from "@/components/sb/error-card";

export default function FeesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorCard title="Couldn't load fees" requestId={error.digest ?? null} onRetry={reset} />;
}
