import { describe, expect, it } from "vitest";
import { hasPermission, PERMISSION_KEYS, type PermissionKey } from "./permissions";

describe("hasPermission", () => {
  it("denies anonymous", () => {
    expect(hasPermission(null, "audit.view")).toBe(false);
  });
  it("grants everything to super_admin", () => {
    for (const k of PERMISSION_KEYS) {
      expect(hasPermission({ role: "super_admin", permissions: [] }, k)).toBe(true);
    }
  });
  const cases: Array<[PermissionKey, string[]]> = [
    ["dashboard.view", ["reports.read", "reports:read"]],
    ["users.view", ["users.read", "users:read"]],
    ["disputes.view", ["disputes.read", "disputes:read"]],
    ["salons.view", ["salons.read", "salons:read"]],
    ["salon_application.approve", ["applications.decide", "applications:decide"]],
    ["user.suspend", ["users.suspend", "users:suspend"]],
    ["bank_account.reveal", ["payouts.manage", "payouts:manage", "payouts:write"]],
    ["payout_account.verify", ["payouts.manage", "payouts:write"]],
    ["payout_run.approve", ["payouts.manage", "payouts:write"]],
    ["dispute.decide", ["disputes.decide", "disputes:decide", "disputes:write"]],
    ["fees.view", ["fees.read", "fees:read", "fees.manage", "fees:write"]],
    ["fees.change", ["fees.manage", "fees:manage", "fees:write"]],
    ["moderation.act", ["moderation.decide", "moderation:decide"]],
    ["admin.manage", ["roles.manage", "roles:manage"]],
    ["audit.view", ["audit.read", "audit:read"]],
    ["engagement.edit", ["engagement.manage", "engagement:manage"]],
  ];

  it("has a case for every console key", () => {
    expect(cases.map(([k]) => k).sort()).toEqual([...PERMISSION_KEYS].sort());
  });

  it.each(cases)("grants %s for each API string", (key, strings) => {
    for (const p of strings) expect(hasPermission({ role: "admin", permissions: [p] }, key)).toBe(true);
  });

  it.each([
    ["salon_application.approve", "applications.approve"],
    ["salon_application.approve", "applications.read"],
    ["payout_account.verify", "payouts.write"],
    ["payout_account.verify", "payouts.read"],
    ["fees.change", "fees.write"],
    ["fees.change", "fees.read"],
    ["moderation.act", "moderation.write"],
    ["admin.manage", "admins.manage"],
    ["engagement.edit", "engagement.write"],
    ["user.suspend", "users.write"],
  ] as Array<[PermissionKey, string]>)("does not grant %s for %s", (key, p) => {
    expect(hasPermission({ role: "admin", permissions: [p] }, key)).toBe(false);
  });
});
