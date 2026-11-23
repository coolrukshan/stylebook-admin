import { IDLE_LIMIT_MS, type SessionData } from "./session-options";

export type SessionState = "anonymous" | "expired" | "idle" | "active";

/** Pure decision used by `proxy.ts`. Unit-tested. */
export function evaluateSession(
  data: Partial<SessionData> | null | undefined,
  now: number,
): SessionState {
  if (!data?.accessToken) return "anonymous";
  if (typeof data.expiresAt === "number" && now >= data.expiresAt) return "expired";
  const last = data.lastActiveAt ?? 0;
  if (now - last >= IDLE_LIMIT_MS) return "idle";
  return "active";
}

/** Only same-origin absolute paths; blocks open redirects like `//evil.com`. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return "/";
  }
  return next;
}
