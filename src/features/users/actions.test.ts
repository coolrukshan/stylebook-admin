import { beforeEach, describe, expect, it, vi } from "vitest";

const runAdminAction = vi.fn();
vi.mock("@/lib/actions/run-admin-action", () => ({ runAdminAction: (o: unknown) => runAdminAction(o) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const { suspendUser, reactivateUser } = await import("./actions");
const ID = "3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b";

beforeEach(() => {
  runAdminAction.mockReset();
  runAdminAction.mockResolvedValue({ ok: true, data: { id: ID } });
});

describe("user actions", () => {
  it("rejects bad ids and short reasons without calling the API", async () => {
    expect((await suspendUser("x", "Payment fraud")).ok).toBe(false);
    expect((await suspendUser(ID, "no")).ok).toBe(false);
    expect((await reactivateUser(ID, "   ")).ok).toBe(false);
    expect(runAdminAction).not.toHaveBeenCalled();
  });
  it("requires user.suspend and names the audit event", async () => {
    await suspendUser(ID, "Payment fraud", "k1");
    await reactivateUser(ID, "Appeal accepted", "k2");
    expect(runAdminAction.mock.calls.map(([o]) => [o.permission, o.name, o.idempotencyKey])).toEqual([
      ["user.suspend", "user.suspended", "k1"],
      ["user.suspend", "user.reactivated", "k2"],
    ]);
  });
  it("sends reason to suspend and note to reactivate", async () => {
    const calls: unknown[] = [];
    runAdminAction.mockImplementation(async (o: { call: (api: unknown) => Promise<unknown> }) => {
      await o.call({
        POST: async (path: string, init: { body: unknown }) => {
          calls.push([path, init.body]);
          return { data: {}, response: { ok: true } };
        },
      });
      return { ok: true, data: { id: ID } };
    });
    await suspendUser(ID, "Payment fraud");
    await reactivateUser(ID, "Appeal accepted");
    expect(calls).toEqual([
      ["/v1/admin/users/{user_id}/suspend", { reason: "Payment fraud" }],
      ["/v1/admin/users/{user_id}/reactivate", { note: "Appeal accepted" }],
    ]);
  });
});
