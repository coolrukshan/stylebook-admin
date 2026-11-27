import { describe, expect, it } from "vitest";
import { API_PERMISSIONS } from "@/lib/auth/permissions";
import { applyChanges, countGranted, isGranted, PERMISSION_NAMES } from "./catalogue";
import { accessChangeSchema, toAdminRow, adminSchema } from "./schemas";

const ID = "3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b";

describe("permission catalogue", () => {
  it("lists the API's 27 permissions once each", () => {
    expect(PERMISSION_NAMES).toHaveLength(27);
    expect(new Set(PERMISSION_NAMES).size).toBe(27);
  });

  it("covers every string the console itself checks", () => {
    const known = new Set<string>(PERMISSION_NAMES);
    for (const forms of Object.values(API_PERMISSIONS)) {
      for (const p of forms.filter((f) => f.includes("."))) expect(known).toContain(p);
    }
  });

  it("recognises colon and write spellings", () => {
    expect(isGranted(["users:read"], "users.read")).toBe(true);
    expect(isGranted(["payouts:write"], "payouts.manage")).toBe(true);
    expect(isGranted(["payouts.manage"], "payouts.read")).toBe(false);
    expect(countGranted(["fees:write", "fees.manage", "unknown.perm"])).toBe(1);
  });

  it("revokes every spelling and preserves unknown strings", () => {
    expect(
      applyChanges(["payouts.manage", "payouts:write", "legacy.thing", "users.read"], [], ["payouts.manage"]),
    ).toEqual(["legacy.thing", "users.read"]);
  });

  it("grants the dot form without duplicating an existing spelling", () => {
    expect(applyChanges(["users:read"], ["users.read", "fees.read"], [])).toEqual(["users:read", "fees.read"]);
  });
});

describe("access change input", () => {
  const ok = (v: object) => accessChangeSchema.safeParse({ adminId: ID, grant: [], revoke: [], ...v }).success;
  it("needs a known, non-overlapping change", () => {
    expect(ok({ grant: ["users.read"] })).toBe(true);
    expect(ok({})).toBe(false);
    expect(ok({ grant: ["users.write"] })).toBe(false);
    expect(ok({ grant: ["users.read"], revoke: ["users.read"] })).toBe(false);
    expect(ok({ adminId: "x", grant: ["users.read"] })).toBe(false);
  });
  it("never grants roles.manage but can remove it", () => {
    expect(ok({ grant: ["roles.manage"] })).toBe(false);
    expect(ok({ revoke: ["roles.manage"] })).toBe(true);
  });
  it("drops the email from admin rows", () => {
    const row = toAdminRow(
      adminSchema.parse({ id: ID, email: "a@x.lk", full_name: "A", role: "support", is_active: true, totp_enabled: false }),
    );
    expect(JSON.stringify(row)).not.toContain("a@x.lk");
  });
});
