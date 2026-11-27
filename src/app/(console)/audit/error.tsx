"use client";

import { ErrorCard } from "@/components/sb/error-card";

export default function AuditError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorCard title="Couldn't load the audit log" requestId={error.digest ?? null} onRetry={reset} />;
}
