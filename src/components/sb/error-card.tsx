"use client";

import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MONO_CLASS } from "@/lib/format/ids";
import { cn } from "@/lib/utils";

/**
 * Inline error card with retry and the request id to quote. Never pass a raw
 * API message here (may contain PII); use ActionError.message / userMessage().
 */
export function ErrorCard({
  title = "Couldn't load",
  message = "Something went wrong. Try again.",
  requestId,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  requestId?: string | null;
  /** Defaults to router.refresh(). Error boundaries pass `reset`. */
  onRetry?: () => void;
  className?: string;
}) {
  const router = useRouter();
  return (
    <div
      role="alert"
      className={cn("flex items-start gap-4 rounded-card border border-line bg-surface p-6 shadow-card", className)}
    >
      <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
      <div className="flex-1">
        <p className="font-semibold text-text">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        {requestId && (
          <p className="mt-2 text-xs text-muted-foreground">
            Request ID <span className={MONO_CLASS}>{requestId}</span>
          </p>
        )}
      </div>
      <Button variant="outline" onClick={onRetry ?? (() => router.refresh())}>
        Retry
      </Button>
    </div>
  );
}
