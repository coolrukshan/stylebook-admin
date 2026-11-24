import { beforeEach, describe, expect, it, vi } from "vitest";

const runAdminAction = vi.fn();
vi.mock("@/lib/actions/run-admin-action", () => ({ runAdminAction: (o: unknown) => runAdminAction(o) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const { decideDispute, getDisputeStatus } = await import("./actions");
const ID = "3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b";

beforeEach(() => {
  runAdminAction.mockReset();
  runAdminAction.mockResolvedValue({ ok: true, data: { status: "resolved" } });
});

describe("decideDispute", () => {
  it("rejects bad ids, unknown decisions and empty reasons without calling the API", async () => {
    expect((await decideDispute("x", "reject", "Not enough evidence")).ok).toBe(false);
    expect((await decideDispute(ID, "half_refund", "Because")).ok).toBe(false);
    expect((await decideDispute(ID, "reject", "  ")).ok).toBe(false);
    expect(runAdminAction).not.toHaveBeenCalled();
  });
  it("requires dispute.decide and names the audit event", async () => {
    await decideDispute(ID, "full_refund", "Salon did not respond", "k1");
    await decideDispute(ID, "reject", "Not enough evidence", "k2");
    expect(runAdminAction.mock.calls.map(([o]) => [o.permission, o.name, o.idempotencyKey])).toEqual([
      ["dispute.decide", "dispute.refunded", "k1"],
      ["dispute.decide", "dispute.rejected", "k2"],
    ]);
  });
  it("never sends an amount and maps full_refund to refund", async () => {
    const bodies: unknown[] = [];
    runAdminAction.mockImplementation(async (o: { call: (api: unknown) => Promise<unknown> }) => {
      await o.call({
        POST: async (_p: string, init: { body: unknown }) => {
          bodies.push(init.body);
          return { data: { status: "resolved" }, response: { ok: true } };
        },
      });
      return { ok: true, data: { status: "resolved" } };
    });
    await decideDispute(ID, "full_refund", "Salon did not respond");
    await decideDispute(ID, "reject", "Not enough evidence");
    expect(bodies).toEqual([
      { decision: "refund", reason: "Salon did not respond" },
      { decision: "reject", reason: "Not enough evidence" },
    ]);
    expect(JSON.stringify(bodies)).not.toContain("amount");
  });
});

describe("getDisputeStatus", () => {
  it("validates the id and returns only the status", async () => {
    expect((await getDisputeStatus("x")).ok).toBe(false);
    runAdminAction.mockImplementation(async (o: { call: (api: unknown) => Promise<unknown> }) => ({
      ok: true,
      data: await o.call({ GET: async () => ({ data: { status: "resolved", reason: "private" }, response: { ok: true } }) }),
    }));
    expect(await getDisputeStatus(ID)).toEqual({ ok: true, data: { status: "resolved" } });
  });
});
