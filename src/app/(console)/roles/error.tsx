"use client";

import { ErrorCard } from "@/components/sb/error-card";

export default function RolesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorCard title="Couldn't load admins" requestId={error.digest ?? null} onRetry={reset} />;
}
