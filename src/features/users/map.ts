import { maskEmail, maskPhone } from "@/lib/format/mask";
import type { UserDetailRaw, UserListItem } from "./schemas";

export type UserStatus = "active" | "suspended";

/** Admin accounts are managed in A-12, never suspended from this screen. */
const ADMIN_ROLES = new Set(["admin", "super_admin", "support", "finance", "moderator"]);
export const isAdminRole = (role: string) => ADMIN_ROLES.has(role.toLowerCase());

const ROLE_LABELS: Record<string, string> = {
  client: "Client",
  customer: "Client",
  partner: "Partner",
  salon_owner: "Partner · owner",
  owner: "Partner · owner",
  specialist: "Partner · specialist",
  staff: "Partner · specialist",
};
/** UNVERIFIED role values: unknown ones show their raw string, never hidden. */
export function roleLabel(role: string): string {
  return ROLE_LABELS[role.toLowerCase()] ?? role.replace(/_/g, " ");
}

export const userStatus = (isActive: boolean): UserStatus => (isActive ? "active" : "suspended");

/** The only user shape client components receive: contact fields are masked, raw values dropped. */
export type UserRow = {
  id: string;
  name: string;
  emailMasked: string;
  phoneMasked: string;
  roleLabel: string;
  bookings: number;
  joinedAt: string;
  status: UserStatus;
  suspendedAt: string | null;
  canAct: boolean;
};

export function toUserRow(u: UserListItem): UserRow {
  return {
    id: u.id,
    name: u.full_name?.trim() || "Unnamed user",
    emailMasked: maskEmail(u.email),
    phoneMasked: maskPhone(u.phone),
    roleLabel: roleLabel(u.role),
    bookings: u.booking_count,
    joinedAt: u.created_at,
    status: userStatus(u.is_active),
    suspendedAt: u.suspended_at ?? null,
    canAct: !isAdminRole(u.role),
  };
}

export type UserDetail = UserRow & {
  suspendReason: string | null;
  orders: number;
  totalSpendCents: number;
  disputes: number;
  reviews: number;
  favourites: number;
  lastBookingAt: string | null;
  salons: UserDetailRaw["salons_owned"];
  recentBookings: UserDetailRaw["recent_bookings"];
  recentOrders: UserDetailRaw["recent_orders"];
};

export function toUserDetail(d: UserDetailRaw): UserDetail {
  return {
    ...toUserRow(d),
    suspendReason: d.suspend_reason ?? null,
    orders: d.order_count,
    totalSpendCents: d.total_spend_cents,
    disputes: d.dispute_count,
    reviews: d.review_count,
    favourites: d.favourite_salons,
    lastBookingAt: d.last_booking_at ?? null,
    salons: d.salons_owned,
    recentBookings: d.recent_bookings,
    recentOrders: d.recent_orders,
  };
}

/** Newest joined first, within the loaded page (the API has no sort). */
export function sortNewestFirst(rows: readonly UserRow[]): UserRow[] {
  return [...rows].sort((a, b) => Date.parse(b.joinedAt) - Date.parse(a.joinedAt));
}

export const STATUS_FILTERS = ["all", "active", "suspended"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];
export function parseStatusFilter(v: string | string[] | undefined): StatusFilter {
  const s = Array.isArray(v) ? v[0] : v;
  return (STATUS_FILTERS as readonly string[]).includes(s ?? "") ? (s as StatusFilter) : "all";
}
export const isActiveParam = (f: StatusFilter): boolean | null => (f === "all" ? null : f === "active");
