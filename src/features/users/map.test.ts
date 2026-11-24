import { describe, expect, it } from "vitest";
import { isActiveParam, isAdminRole, parseStatusFilter, roleLabel, sortNewestFirst, toUserDetail, toUserRow } from "./map";
import type { UserDetailRaw, UserListItem } from "./schemas";

const item: UserListItem = {
  id: "u1",
  full_name: "Nimal Perera",
  email: "nimal.perera@example.com",
  phone: "+94771234567",
  role: "client",
  is_active: true,
  suspended_at: null,
  booking_count: 14,
  created_at: "2026-02-10T00:00:00Z",
};

describe("toUserRow", () => {
  it("masks contact details and drops the raw values", () => {
    const row = toUserRow(item);
    expect(row.emailMasked).toBe("n••••a@example.com");
    expect(row.phoneMasked).toBe("+94 77 ••• 4567");
    const json = JSON.stringify(row);
    expect(json).not.toContain("nimal.perera");
    expect(json).not.toContain("1234567");
  });
  it("derives status and falls back for missing names", () => {
    expect(toUserRow({ ...item, is_active: false }).status).toBe("suspended");
    expect(toUserRow({ ...item, full_name: null }).name).toBe("Unnamed user");
  });
  it("does not offer actions on admin roles", () => {
    expect(toUserRow({ ...item, role: "super_admin" }).canAct).toBe(false);
    expect(isAdminRole("Support")).toBe(true);
    expect(toUserRow(item).canAct).toBe(true);
  });
});

describe("toUserDetail", () => {
  it("keeps masking and carries activity", () => {
    const raw = {
      ...item,
      suspend_reason: "Spam",
      order_count: 2,
      total_spend_cents: 150000,
      dispute_count: 0,
      review_count: 1,
      favourite_salons: 3,
      last_booking_at: null,
      salons_owned: [],
      recent_bookings: [],
      recent_orders: [],
    } satisfies UserDetailRaw;
    const d = toUserDetail(raw);
    expect(d.totalSpendCents).toBe(150000);
    expect(JSON.stringify(d)).not.toContain("example.com/");
    expect(JSON.stringify(d)).not.toContain("nimal.perera");
  });
});

describe("helpers", () => {
  it("labels known roles and shows unknown ones raw", () => {
    expect(roleLabel("client")).toBe("Client");
    expect(roleLabel("salon_owner")).toBe("Partner · owner");
    expect(roleLabel("vip_guest")).toBe("vip guest");
  });
  it("sorts newest joined first without mutating", () => {
    const a = toUserRow(item);
    const b = toUserRow({ ...item, id: "u2", created_at: "2026-03-01T00:00:00Z" });
    const input = [a, b];
    expect(sortNewestFirst(input)[0].id).toBe("u2");
    expect(input[0].id).toBe("u1");
  });
  it("parses the status filter", () => {
    expect(parseStatusFilter("nope")).toBe("all");
    expect(parseStatusFilter(["suspended"])).toBe("suspended");
    expect(isActiveParam("all")).toBeNull();
    expect(isActiveParam("active")).toBe(true);
    expect(isActiveParam("suspended")).toBe(false);
  });
});
