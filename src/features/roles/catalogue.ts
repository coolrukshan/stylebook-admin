import { apiForms } from "@/lib/auth/permissions";

/**
 * Every permission string the API checks (`require_permission` in StylebookAPI).
 * The API has no endpoint listing them, and matching is exact: "manage" does not
 * include "read". Keep in step with the backend routers.
 */
const GROUPS = [
  ["Dashboard and search", [["reports.read", "View dashboard and reports"], ["search", "Use global search"]]],
  ["Salon applications", [["applications.read", "View salon applications"], ["applications.decide", "Approve, reject or ask for more information"]]],
  ["Users", [["users.read", "View users"], ["users.suspend", "Suspend and reactivate users"]]],
  ["Salons", [["salons.read", "View salons"], ["salons.manage", "Suspend, reactivate and feature salons"], ["salons.impersonate", "View the app as a salon"]]],
  ["Payouts", [["payouts.read", "View payout accounts and runs"], ["payouts.manage", "Verify accounts, reveal account numbers and manage payout runs"]]],
  ["Disputes and refunds", [["disputes.read", "View disputes"], ["disputes.decide", "Decide disputes and refunds"]]],
  ["Fees", [["fees.read", "View fees and commission"], ["fees.manage", "Change fees and commission"]]],
  ["Moderation", [["moderation.read", "View the moderation queue"], ["moderation.decide", "Moderate reviews and AI posts"]]],
  ["Re-engagement", [["engagement.read", "View re-engagement results"], ["engagement.manage", "Reset the holdout group"]]],
  ["Support tickets", [["tickets.read", "View tickets"], ["tickets.manage", "Create and update tickets"]]],
  ["Catalogue", [["catalogue.read", "View the catalogue"], ["catalogue.manage", "Edit the catalogue"]]],
  ["Settings and announcements", [["settings.read", "View settings and announcements"], ["settings.manage", "Change settings and announcements"]]],
  ["Administration", [["audit.read", "View the audit log"], ["roles.manage", "Manage admins and roles"]]],
] as const;

export type PermissionName = (typeof GROUPS)[number][1][number][0];

export type PermissionGroup = { title: string; items: { name: PermissionName; label: string }[] };

export const PERMISSION_GROUPS: PermissionGroup[] = GROUPS.map(([title, items]) => ({
  title,
  items: items.map(([name, label]) => ({ name, label })),
}));

export const PERMISSION_NAMES = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.name)) as [
  PermissionName,
  ...PermissionName[],
];

const LABELS = new Map(PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => [i.name, i.label] as const)));
export const permissionLabel = (name: PermissionName) => LABELS.get(name) ?? name;

/**
 * Removable but never grantable here: the API lets a `roles.manage` holder make
 * themselves Super admin (plan 08, S1).
 */
export const NOT_GRANTABLE: ReadonlySet<PermissionName> = new Set<PermissionName>(["roles.manage"]);

export const isGranted = (current: readonly string[], name: PermissionName) =>
  apiForms(name).some((form) => current.includes(form));

export const countGranted = (current: readonly string[]) =>
  PERMISSION_NAMES.filter((name) => isGranted(current, name)).length;

/**
 * Applies only the ticked and unticked changes to the stored array. Revoking
 * removes every spelling; strings the console does not know are preserved.
 */
export function applyChanges(
  current: readonly string[],
  grant: readonly PermissionName[],
  revoke: readonly PermissionName[],
): string[] {
  const removed = new Set(revoke.flatMap((name) => apiForms(name)));
  const next = current.filter((p) => !removed.has(p));
  for (const name of grant) if (!isGranted(next, name)) next.push(name);
  return next;
}
