"use client";

import { ErrorCard } from "@/components/sb/error-card";

export default function EngagementError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorCard title="Couldn't load re-engagement" requestId={error.digest ?? null} onRetry={reset} />;
}
