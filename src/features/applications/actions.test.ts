import { beforeEach, describe, expect, it, vi } from "vitest";

const runAdminAction = vi.fn();
vi.mock("@/lib/actions/run-admin-action", () => ({ runAdminAction: (o: unknown) => runAdminAction(o) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { approveApplication, rejectApplication, requestApplicationInfo } = await import("./actions");
const ID = "3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b";

beforeEach(() => {
  runAdminAction.mockReset();
  runAdminAction.mockResolvedValue({ ok: true, data: { status: "approved" } });
});

describe("application actions", () => {
  it("rejects a malformed id without calling the API", async () => {
    const r = await approveApplication("nope");
    expect(r).toMatchObject({ ok: false, error: { status: 422 } });
    expect(runAdminAction).not.toHaveBeenCalled();
  });
  it("requires a reason for reject and request info", async () => {
    expect((await rejectApplication(ID, "  ")).ok).toBe(false);
    expect((await requestApplicationInfo(ID, "ab")).ok).toBe(false);
    expect(runAdminAction).not.toHaveBeenCalled();
  });
  it("approves with the salon_application.approve permission and an audit name", async () => {
    await approveApplication(ID, "key-1");
    expect(runAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "salon_application.approve", name: "salon_application.approved", idempotencyKey: "key-1" }),
    );
  });
  it("names reject for the audit log", async () => {
    await rejectApplication(ID, "Documents invalid", "k");
    expect(runAdminAction).toHaveBeenCalledWith(expect.objectContaining({ name: "salon_application.rejected" }));
  });
});
