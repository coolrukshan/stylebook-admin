"use client";

import { ErrorCard } from "@/components/sb/error-card";

export default function UsersError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorCard title="Couldn't load users" requestId={error.digest ?? null} onRetry={reset} />;
}
