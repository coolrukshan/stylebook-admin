/**
 * Console permission keys (_specs/00-shared.md section 2) and the API strings
 * that grant them. The API strings come from the backend's `require_permission`
 * declarations (StylebookAPI `core/deps.py` and the admin routers). The API
 * also accepts the colon form of each, plus a few `:write` aliases.
 */
export const PERMISSION_KEYS = [
  "dashboard.view",
  "users.view",
  "disputes.view",
  "salons.view",
  "salon_application.approve",
  "user.suspend",
  "bank_account.reveal",
  "payout_account.verify",
  "payout_run.approve",
  "dispute.decide",
  "fees.view",
  "fees.change",
  "moderation.act",
  "admin.manage",
  "audit.view",
  "engagement.view",
  "engagement.edit",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type AdminIdentity = {
  role: string;
  permissions: readonly string[];
};

/** "users.read" -> ["users.read", "users:read"], plus any extra aliases the API accepts. */
const api = (name: string, ...aliases: string[]): readonly string[] => [name, name.replace(".", ":"), ...aliases];

const PAYOUTS_MANAGE = api("payouts.manage", "payouts:write");
const FEES_MANAGE = api("fees.manage", "fees:write");

/** Console key -> API permission strings (any match grants). */
export const API_PERMISSIONS: Record<PermissionKey, readonly string[]> = {
  "dashboard.view": api("reports.read"),
  "users.view": api("users.read"),
  "disputes.view": api("disputes.read"),
  "salons.view": api("salons.read"),
  "salon_application.approve": api("applications.decide"),
  "user.suspend": api("users.suspend"),
  "bank_account.reveal": PAYOUTS_MANAGE,
  "payout_account.verify": PAYOUTS_MANAGE,
  "payout_run.approve": PAYOUTS_MANAGE,
  "dispute.decide": api("disputes.decide", "disputes:write"),
  "fees.view": [...api("fees.read"), ...FEES_MANAGE],
  "fees.change": FEES_MANAGE,
  "moderation.act": api("moderation.decide"),
  "admin.manage": api("roles.manage"),
  "audit.view": api("audit.read"),
  "engagement.view": [...api("engagement.read"), ...api("engagement.manage")],
  "engagement.edit": api("engagement.manage"),
};

export const SUPER_ADMIN_ROLE = "super_admin";

/** UI convenience and server guard input. The API still enforces everything. */
export function hasPermission(
  me: AdminIdentity | null | undefined,
  key: PermissionKey,
): boolean {
  if (!me) return false;
  if (me.role === SUPER_ADMIN_ROLE) return true; // locked to all permissions (A-12)
  return API_PERMISSIONS[key].some((p) => me.permissions.includes(p));
}

export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    super_admin: "Super admin",
    admin: "Admin",
    support: "Support",
    finance: "Finance",
    moderator: "Moderator",
  };
  return labels[role] ?? role.replace(/_/g, " ");
}
