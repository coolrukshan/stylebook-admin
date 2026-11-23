import { describe, expect, it } from "vitest";
import { hasPermission, PERMISSION_KEYS } from "./permissions";

describe("hasPermission", () => {
  it("denies anonymous", () => {
    expect(hasPermission(null, "audit.view")).toBe(false);
  });
  it("grants everything to super_admin", () => {
    for (const k of PERMISSION_KEYS) {
      expect(hasPermission({ role: "super_admin", permissions: [] }, k)).toBe(true);
    }
  });
  it("matches mapped API permission strings", () => {
    const me = { role: "support", permissions: ["users.read", "users.write"] };
    expect(hasPermission(me, "users.view")).toBe(true);
    expect(hasPermission(me, "user.suspend")).toBe(true);
    expect(hasPermission(me, "fees.change")).toBe(false);
  });
  it("matches a spec key returned verbatim", () => {
    expect(hasPermission({ role: "finance", permissions: ["fees.change"] }, "fees.change")).toBe(true);
  });
  it("does not grant on a different area", () => {
    expect(hasPermission({ role: "moderator", permissions: ["moderation.write"] }, "admin.manage")).toBe(false);
  });
});
