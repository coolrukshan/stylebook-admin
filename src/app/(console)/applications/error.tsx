"use client";

import { ErrorCard } from "@/components/sb/error-card";

export default function ApplicationsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorCard title="Couldn't load applications" requestId={error.digest ?? null} onRetry={reset} />;
}
