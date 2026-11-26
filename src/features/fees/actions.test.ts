import { beforeEach, describe, expect, it, vi } from "vitest";

const runAdminAction = vi.fn();
vi.mock("@/lib/actions/run-admin-action", () => ({ runAdminAction: (o: unknown) => runAdminAction(o) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const { saveFees, saveOverride, removeOverride, searchSalons } = await import("./actions");
const ID = "3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b";

type Call = { call: (api: unknown) => Promise<unknown> };

beforeEach(() => {
  runAdminAction.mockReset();
  runAdminAction.mockResolvedValue({ ok: true, data: {} });
});

describe("fee actions", () => {
  it("rejects empty, out-of-range and unknown input without calling the API", async () => {
    expect((await saveFees({})).ok).toBe(false);
    expect((await saveFees({ service_commission_percent: 51 })).ok).toBe(false);
    expect((await saveFees({ something_else: 1 })).ok).toBe(false);
    expect((await saveOverride({ salonId: ID, service: null, product: null })).ok).toBe(false);
    expect((await removeOverride("x")).ok).toBe(false);
    expect((await searchSalons("a")).ok).toBe(false);
    expect(runAdminAction).not.toHaveBeenCalled();
  });

  it("uses fees.change for writes and salons.view for the search", async () => {
    await saveFees({ service_commission_percent: 9 }, "k");
    await saveOverride({ salonId: ID, service: 6, product: null }, "k");
    await removeOverride(ID, "k");
    await searchSalons("looks");
    expect(runAdminAction.mock.calls.map(([o]) => [o.permission, o.name])).toEqual([
      ["fees.change", "fees.update"],
      ["fees.change", "fees.override"],
      ["fees.change", "fees.override.delete"],
      ["salons.view", "fees.salon_search"],
    ]);
  });

  it("sends only changed fees, and both override rates", async () => {
    const bodies: unknown[] = [];
    const response = { ok: true };
    runAdminAction.mockImplementation(async (o: Call) => {
      await o.call({
        PUT: async (_p: string, i: { body: Record<string, number> }) => {
          bodies.push(i.body);
          return {
            data: {
              service_commission_percent: 9,
              product_commission_percent: 10,
              deposit_default_percent: 30,
              max_no_show_fee_percent: 50,
              ai_credit_price_cents: 5000,
            },
            response,
          };
        },
        POST: async (_p: string, i: { body: unknown }) => {
          bodies.push(i.body);
          return { data: {}, response };
        },
      });
      return { ok: true, data: {} };
    });
    await saveFees({ service_commission_percent: 9 });
    await saveOverride({ salonId: ID, service: 6, product: 8 });
    expect(bodies).toEqual([
      { service_commission_percent: 9 },
      { salon_id: ID, service_commission_percent: 6, product_commission_percent: 8 },
    ]);
  });

  it("treats a 204 delete as success and an error status as failure", async () => {
    runAdminAction.mockImplementation(async (o: Call) => ({ ok: true, data: await o.call({ DELETE: async () => ({ response: { ok: true } }) }) }));
    expect((await removeOverride(ID)).ok).toBe(true);
    runAdminAction.mockImplementation(async (o: Call) => {
      await expect(
        o.call({ DELETE: async () => ({ error: { code: "NOT_FOUND" }, response: new Response(null, { status: 404 }) }) }),
      ).rejects.toMatchObject({ status: 404 });
      return { ok: false };
    });
    await removeOverride(ID);
  });
});
