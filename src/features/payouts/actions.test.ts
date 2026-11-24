import { beforeEach, describe, expect, it, vi } from "vitest";

const runAdminAction = vi.fn();
vi.mock("@/lib/actions/run-admin-action", () => ({ runAdminAction: (o: unknown) => runAdminAction(o) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { revealPayoutAccount, verifyPayoutAccount, rejectPayoutAccount } = await import("./actions");
const ID = "3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b";

beforeEach(() => {
  runAdminAction.mockReset();
  runAdminAction.mockResolvedValue({ ok: true, data: {} });
});

describe("payout account actions", () => {
  it("rejects malformed ids without calling the API", async () => {
    expect((await revealPayoutAccount("x")).ok).toBe(false);
    expect((await verifyPayoutAccount("x")).ok).toBe(false);
    expect((await rejectPayoutAccount("x", "Suspected fraud")).ok).toBe(false);
    expect(runAdminAction).not.toHaveBeenCalled();
  });
  it("requires a reason to reject", async () => {
    expect((await rejectPayoutAccount(ID, "  ")).ok).toBe(false);
    expect(runAdminAction).not.toHaveBeenCalled();
  });
  it("uses the least-privilege permission for each action", async () => {
    await revealPayoutAccount(ID);
    await verifyPayoutAccount(ID, "k");
    await rejectPayoutAccount(ID, "Suspected fraud", "k");
    const calls = runAdminAction.mock.calls.map(([o]) => [o.permission, o.name]);
    expect(calls).toEqual([
      ["bank_account.reveal", "bank_account.revealed"],
      ["payout_account.verify", "payout_account.verified"],
      ["payout_account.verify", "payout_account.rejected"],
    ]);
  });
  it("returns only the account number from reveal", async () => {
    runAdminAction.mockImplementation(async (o: { call: (api: unknown) => Promise<unknown> }) => ({
      ok: true,
      data: await o.call({
        POST: async () => ({
          data: { id: ID, salon_id: ID, bank_name: "B", account_name: "N", account_number: "8001234821" },
          response: { ok: true },
        }),
      }),
    }));
    expect(await revealPayoutAccount(ID)).toEqual({ ok: true, data: "8001234821" });
  });
});
