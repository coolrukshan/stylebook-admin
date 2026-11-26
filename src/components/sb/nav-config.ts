import type { NavCountKey } from "@/lib/api/nav-counts";
import type { PermissionKey } from "@/lib/auth/permissions";

export type NavItem = {
  label: string;
  href: string;
  /** Item is hidden unless the admin holds this permission. */
  permission: PermissionKey;
  badge?: NavCountKey;
};

/**
 * Order from the A-03 mockup. The spec has no "view" key for several areas, so
 * the gating key is the closest one (ASSUMPTION, revisit when real /admin/me
 * permission strings are known). Entries after Re-engagement are not in the
 * mockup and are appended per spec 00 section 1.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Dashboard", href: "/", permission: "dashboard.view" },
  { label: "Salon applications", href: "/applications", permission: "salon_application.approve", badge: "applications" },
  { label: "Payout accounts", href: "/payouts/accounts", permission: "payout_account.verify", badge: "payoutAccounts" },
  { label: "Users", href: "/users", permission: "users.view" },
  { label: "Disputes and refunds", href: "/disputes", permission: "dispute.decide", badge: "disputes" },
  { label: "Fees and commission", href: "/fees", permission: "fees.view" },
  { label: "Re-engagement", href: "/engagement", permission: "engagement.edit" },
  { label: "Reports", href: "/reports", permission: "dashboard.view" },
  { label: "Moderation", href: "/moderation", permission: "moderation.act", badge: "moderation" },
  { label: "Tickets", href: "/tickets", permission: "users.view" },
  { label: "Catalogue", href: "/catalogue", permission: "salons.view" },
  { label: "Announcements", href: "/announcements", permission: "engagement.edit" },
  { label: "Admin roles", href: "/roles", permission: "admin.manage" },
  { label: "Audit log", href: "/audit", permission: "audit.view" },
];

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
