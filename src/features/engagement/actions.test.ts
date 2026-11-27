import { beforeEach, describe, expect, it, vi } from "vitest";

const runAdminAction = vi.fn();
vi.mock("@/lib/actions/run-admin-action", () => ({ runAdminAction: (o: unknown) => runAdminAction(o) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const { resetHoldout } = await import("./actions");

beforeEach(() => {
  runAdminAction.mockReset();
  runAdminAction.mockResolvedValue({ ok: true, data: {} });
});

describe("resetHoldout", () => {
  it("rejects bad input without calling the API", async () => {
    expect((await resetHoldout(0, "Restart the measurement")).ok).toBe(false);
    expect((await resetHoldout(51, "Restart the measurement")).ok).toBe(false);
    expect((await resetHoldout(10, " ")).ok).toBe(false);
    expect(runAdminAction).not.toHaveBeenCalled();
  });
  it("requires engagement.edit and sends percentage and reason", async () => {
    let body: unknown;
    runAdminAction.mockImplementation(async (o: { call: (api: unknown) => Promise<unknown> }) => ({
      ok: true,
      data: await o.call({
        POST: async (_p: string, i: { body: unknown }) => {
          body = i.body;
          return { data: { previous_holdout_size: 5, new_holdout_size: 8, holdout_percentage: 15 }, response: { ok: true } };
        },
      }),
    }));
    const r = await resetHoldout(15, "Change holdout size", "k1");
    expect(r).toMatchObject({ ok: true, data: { new_holdout_size: 8 } });
    expect(body).toEqual({ holdout_percentage: 15, reason: "Change holdout size" });
    expect(runAdminAction.mock.calls[0][0]).toMatchObject({
      permission: "engagement.edit",
      name: "engagement.holdout_reset",
      idempotencyKey: "k1",
    });
  });
});
