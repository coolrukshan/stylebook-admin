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

/** Extra spellings the API accepts besides the colon form (`_PERMISSION_ALIASES`). */
const WRITE_ALIASES: Record<string, string> = {
  "disputes.decide": "disputes:write",
  "payouts.manage": "payouts:write",
  "fees.manage": "fees:write",
};

/** Every string that grants an API permission: "users.read" -> ["users.read", "users:read"]. */
export function apiForms(name: string): readonly string[] {
  const alias = WRITE_ALIASES[name];
  return [...new Set([name, name.replace(".", ":"), ...(alias ? [alias] : [])])];
}

const PAYOUTS_MANAGE = apiForms("payouts.manage");
const FEES_MANAGE = apiForms("fees.manage");

/** Console key -> API permission strings (any match grants). */
export const API_PERMISSIONS: Record<PermissionKey, readonly string[]> = {
  "dashboard.view": apiForms("reports.read"),
  "users.view": apiForms("users.read"),
  "disputes.view": apiForms("disputes.read"),
  "salons.view": apiForms("salons.read"),
  "salon_application.approve": apiForms("applications.decide"),
  "user.suspend": apiForms("users.suspend"),
  "bank_account.reveal": PAYOUTS_MANAGE,
  "payout_account.verify": PAYOUTS_MANAGE,
  "payout_run.approve": PAYOUTS_MANAGE,
  "dispute.decide": apiForms("disputes.decide"),
  "fees.view": [...apiForms("fees.read"), ...FEES_MANAGE],
  "fees.change": FEES_MANAGE,
  "moderation.act": apiForms("moderation.decide"),
  // Super admin only (A-12). The API also lets `roles.manage` holders edit any
  // admin, including making themselves Super admin, so the console does not.
  "admin.manage": [],
  "audit.view": apiForms("audit.read"),
  "engagement.view": [...apiForms("engagement.read"), ...apiForms("engagement.manage")],
  "engagement.edit": apiForms("engagement.manage"),
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

/** Audit export (spec A-13): Super admin and Finance. Console-side limit only. */
export function canExportAudit(me: AdminIdentity | null | undefined): boolean {
  return hasPermission(me, "audit.view") && (me?.role === SUPER_ADMIN_ROLE || me?.role === "finance");
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
