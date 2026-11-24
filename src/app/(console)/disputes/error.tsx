"use client";

import { ErrorCard } from "@/components/sb/error-card";

export default function DisputesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorCard title="Couldn't load disputes" requestId={error.digest ?? null} onRetry={reset} />;
}
