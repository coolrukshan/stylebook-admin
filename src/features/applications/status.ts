/**
 * Status of an application that still needs a decision.
 * UNVERIFIED: the OpenAPI schema types `status` as a free string and the
 * nav badge already queried `pending`; the mockup says "In review". If a real
 * response differs, change this one constant (list, badge and dashboard use it).
 */
export const ACTIONABLE_STATUS = "pending";

export function isActionable(status: string): boolean {
  return status.toLowerCase() === ACTIONABLE_STATUS;
}

/** `{action}` path segment of POST /v1/admin/applications/{id}/{action}. */
export const DECISION_ACTIONS = ["approve", "request_info", "reject"] as const;
export type DecisionAction = (typeof DECISION_ACTIONS)[number];
