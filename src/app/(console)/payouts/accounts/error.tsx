"use client";

import { ErrorCard } from "@/components/sb/error-card";

export default function PayoutAccountsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorCard title="Couldn't load payout accounts" requestId={error.digest ?? null} onRetry={reset} />;
}
