/** Pure copy helpers (unit-tested). Never reveal which credential failed. */
export const GENERIC_AUTH_ERROR = "Email, password or code is incorrect.";
export const GENERIC_FAILURE = "Something went wrong. Try again.";

export function lockoutMessage(retryAfterSeconds: number | null): string {
  if (!retryAfterSeconds) return "Too many attempts. Try again later.";
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

export type AuthFormState = {
  error?: string;
  requestId?: string | null;
  /** Server-side lock; form disables submit. */
  locked?: boolean;
};

export function messageForStatus(
  status: number,
  retryAfterSeconds: number | null,
): Pick<AuthFormState, "error" | "locked"> {
  if (status === 429) return { error: lockoutMessage(retryAfterSeconds), locked: true };
  if (status === 401 || status === 403 || status === 404 || status === 422) return { error: GENERIC_AUTH_ERROR };
  return { error: GENERIC_FAILURE };
}
