"use client";

import { ErrorCard } from "@/components/sb/error-card";

export default function PayoutRunsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorCard title="Couldn't load payout runs" requestId={error.digest ?? null} onRetry={reset} />;
}
