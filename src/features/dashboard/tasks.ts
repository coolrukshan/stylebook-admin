import type { NavCountKey } from "@/lib/api/nav-counts";
import { hasPermission, type AdminIdentity, type PermissionKey } from "@/lib/auth/permissions";

export type Task = {
  key: NavCountKey;
  label: string;
  href: string;
  permission: PermissionKey;
};

/** Single source for dashboard rows; same keys as the sidebar badges. */
export const TASKS: readonly Task[] = [
  { key: "applications", label: "Salon applications to review", href: "/applications?status=pending", permission: "salons.view" },
  { key: "payoutAccounts", label: "Payout accounts to verify", href: "/payout-accounts?verified=false", permission: "payout_account.verify" },
  { key: "disputes", label: "Disputes waiting for a decision", href: "/disputes?status=admin_review", permission: "disputes.view" },
  { key: "moderation", label: "Reported reviews and AI posts in moderation", href: "/moderation", permission: "moderation.act" },
];

export function allowedTasks(me: AdminIdentity): Task[] {
  return TASKS.filter((t) => hasPermission(me, t.permission));
}
