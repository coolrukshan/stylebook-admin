import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

const assertPermission = vi.fn();
vi.mock("@/lib/auth/require-role", () => ({ assertPermission: (k: string) => assertPermission(k) }));
const getApiClient = vi.fn();
vi.mock("@/lib/api/client", () => ({ getApiClient: (o: unknown) => getApiClient(o) }));
vi.mock("next/navigation", () => ({ unstable_rethrow: (e: unknown) => { if (e instanceof Error && e.message.startsWith("NEXT_")) throw e; } }));

const { runAdminAction } = await import("./run-admin-action");

beforeEach(() => vi.clearAllMocks());

describe("runAdminAction", () => {
  it("rejects server-side without the permission and never touches the API", async () => {
    assertPermission.mockRejectedValue(new ApiError({ status: 403, code: "FORBIDDEN" }));
    const call = vi.fn();
    const result = await runAdminAction({ permission: "fees.change", name: "fees.update", call });
    expect(result).toMatchObject({ ok: false, error: { status: 403, code: "FORBIDDEN" } });
    expect(call).not.toHaveBeenCalled();
    expect(getApiClient).not.toHaveBeenCalled();
    expect(assertPermission).toHaveBeenCalledWith("fees.change");
  });

  it("passes the idempotency key to the client and returns data", async () => {
    assertPermission.mockResolvedValue({});
    getApiClient.mockResolvedValue({ marker: true });
    const result = await runAdminAction({
      permission: "fees.change",
      name: "fees.update",
      idempotencyKey: "key-123456",
      call: async (api) => (api as unknown as { marker: boolean }).marker,
    });
    expect(getApiClient).toHaveBeenCalledWith({ idempotencyKey: "key-123456" });
    expect(result).toEqual({ ok: true, data: true });
  });

  it("converts API errors to safe results without the raw message", async () => {
    assertPermission.mockResolvedValue({});
    getApiClient.mockResolvedValue({});
    const result = await runAdminAction({
      permission: "fees.change",
      name: "fees.update",
      call: async () => {
        throw new ApiError({ status: 409, code: "CONFLICT", message: "user bob@x.lk changed it", requestId: "r1" });
      },
    });
    expect(result).toMatchObject({ ok: false, error: { status: 409, requestId: "r1" } });
    expect(JSON.stringify(result)).not.toContain("bob@x.lk");
  });

  it("re-throws Next control-flow errors (redirects) instead of swallowing them", async () => {
    assertPermission.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(runAdminAction({ permission: "fees.change", name: "x", call: vi.fn() })).rejects.toThrow("NEXT_REDIRECT");
  });
});
