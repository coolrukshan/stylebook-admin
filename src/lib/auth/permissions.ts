/**
 * Spec permission keys (_specs/00-shared.md section 2). Keys marked `*` there
 * are assumptions.
 *
 * The API returns `permissions: string[]` from `GET /v1/admin/me`. The only
 * real key seen in the OpenAPI examples is `users.read`, so the mapping below
 * is a best guess (`<area>.read|write`). UNVERIFIED: confirm against a real
 * `/admin/me` response and edit API_PERMISSIONS (one place).
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
  "fees.change",
  "moderation.act",
  "admin.manage",
  "audit.view",
  "engagement.edit",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type AdminIdentity = {
  role: string;
  permissions: readonly string[];
};

/** Spec key -> accepted API permission strings (any match grants). */
export const API_PERMISSIONS: Record<PermissionKey, readonly string[]> = {
  "dashboard.view": ["dashboard.read", "reports.read"],
  "users.view": ["users.read"],
  "disputes.view": ["disputes.read"],
  "salons.view": ["salons.read"],
  "salon_application.approve": ["applications.write", "applications.approve"],
  "user.suspend": ["users.write", "users.suspend"],
  "bank_account.reveal": ["payouts.reveal", "payouts.write"],
  "payout_account.verify": ["payouts.write", "payouts.verify"],
  "payout_run.approve": ["payouts.write", "payouts.approve"],
  "dispute.decide": ["disputes.write", "disputes.decide"],
  "fees.change": ["fees.write"],
  "moderation.act": ["moderation.write", "moderation.act"],
  "admin.manage": ["admins.write", "roles.write", "admins.manage"],
  "audit.view": ["audit.read"],
  "engagement.edit": ["engagement.write"],
};

export const SUPER_ADMIN_ROLE = "super_admin";

/** UI convenience and server guard input. The API still enforces everything. */
export function hasPermission(
  me: AdminIdentity | null | undefined,
  key: PermissionKey,
): boolean {
  if (!me) return false;
  if (me.role === SUPER_ADMIN_ROLE) return true; // locked to all permissions (A-12)
  if (me.permissions.includes(key)) return true;
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
