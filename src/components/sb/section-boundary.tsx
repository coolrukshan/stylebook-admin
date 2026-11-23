"use client";

import { Component, startTransition, type ErrorInfo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ErrorCard } from "./error-card";

function Fallback({ title, requestId, reset }: { title?: string; requestId?: string | null; reset: () => void }) {
  const router = useRouter();
  return (
    <ErrorCard
      title={title ?? "Couldn't load"}
      requestId={requestId}
      onRetry={() => {
        // Re-run the server render for this route, then retry the subtree.
        startTransition(() => {
          router.refresh();
          reset();
        });
      }}
    />
  );
}

type State = { error: (Error & { requestId?: string | null }) | null };

/**
 * Wraps one card/section so a failure shows "Couldn't load" + retry for that
 * section only (partial data state). Pair with <Suspense> for loading.
 */
export class SectionBoundary extends Component<
  { children: ReactNode; title?: string },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Never log request bodies, search queries or PII. Name only.
    console.error("SectionBoundary caught", error.name, info.componentStack?.split("\n")[1]?.trim());
  }

  render() {
    if (this.state.error) {
      return (
        <Fallback
          title={this.props.title}
          requestId={this.state.error.requestId}
          reset={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
