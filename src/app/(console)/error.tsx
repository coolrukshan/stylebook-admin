"use client";

import { ErrorCard } from "@/components/sb/error-card";

export default function ConsoleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Raw error.message is never shown (may contain PII). The digest lets support
  // find the server log line.
  return (
    <div className="p-8">
      <ErrorCard title="Something went wrong" requestId={error.digest} onRetry={reset} />
    </div>
  );
}
