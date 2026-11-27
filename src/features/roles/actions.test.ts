import { beforeEach, describe, expect, it, vi } from "vitest";

const runAdminAction = vi.fn();
vi.mock("@/lib/actions/run-admin-action", () => ({ runAdminAction: (o: unknown) => runAdminAction(o) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const { updateAdminAccess } = await import("./actions");

const SUPPORT = "3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b";
const BOSS = "4f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b";
const admin = (id: string, role: string, permissions: string[]) => ({
  id,
  full_name: "A",
  role,
  permissions,
  is_active: true,
  totp_enabled: true,
});

type Call = { permission: string; name: string; call: (api: unknown) => Promise<unknown> };

const GET = vi.fn();
const PUT = vi.fn();
let thrown: unknown;

beforeEach(() => {
  thrown = undefined;
  GET.mockReset().mockResolvedValue({
    data: { items: [admin(SUPPORT, "support", ["users.read", "legacy.thing"]), admin(BOSS, "super_admin", [])] },
    response: { ok: true },
  });
  PUT.mockReset().mockResolvedValue({ data: {}, response: { ok: true } });
  runAdminAction.mockReset().mockImplementation(async (o: Call) => {
    try {
      return { ok: true, data: await o.call({ GET, PUT }) };
    } catch (error) {
      thrown = error;
      return { ok: false };
    }
  });
});

describe("updateAdminAccess", () => {
  it("runs under admin.manage and sends only permissions, built from a fresh read", async () => {
    await updateAdminAccess({ adminId: SUPPORT, grant: ["fees.read"], revoke: ["users.read"] }, "k");
    expect(runAdminAction.mock.calls[0][0]).toMatchObject({ permission: "admin.manage", name: "admin_user.update", idempotencyKey: "k" });
    expect(PUT.mock.calls[0][1]).toEqual({
      params: { path: { admin_user_id: SUPPORT } },
      body: { permissions: ["legacy.thing", "fees.read"] },
    });
  });

  it("ignores a role smuggled into the input", async () => {
    await updateAdminAccess({ adminId: SUPPORT, grant: ["fees.read"], revoke: [], role: "super_admin" });
    expect(Object.keys(PUT.mock.calls[0][1].body)).toEqual(["permissions"]);
  });

  it.each([BOSS, "5f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b"])("refuses a Super admin or missing target (%s)", async (adminId) => {
    await updateAdminAccess({ adminId, grant: ["fees.read"], revoke: [] });
    expect(thrown).toMatchObject({ status: 409 });
    expect(PUT).not.toHaveBeenCalled();
  });

  it("skips the write when nothing would change", async () => {
    expect((await updateAdminAccess({ adminId: SUPPORT, grant: ["users.read"], revoke: [] })).ok).toBe(true);
    expect(PUT).not.toHaveBeenCalled();
  });

  it("rejects invalid input without calling the API", async () => {
    expect((await updateAdminAccess({ adminId: SUPPORT, grant: ["roles.manage"], revoke: [] })).ok).toBe(false);
    expect(runAdminAction).not.toHaveBeenCalled();
  });
});
