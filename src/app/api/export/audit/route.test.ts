// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentAdmin = vi.fn();
const GET_API = vi.fn();
const getApiClient = vi.fn(async (...args: unknown[]) => (void args, { GET: GET_API }));
vi.mock("@/lib/auth/current-admin", () => ({ getCurrentAdmin: () => getCurrentAdmin() }));
vi.mock("@/lib/api/client", () => ({ getApiClient: (o: unknown) => getApiClient(o) }));
vi.mock("@/lib/log", () => ({ log: { info: vi.fn(), warn: vi.fn() } }));
const { GET } = await import("./route");

const call = (query = "") => GET(new Request(`http://localhost/api/export/audit?${query}`));
const finance = { id: "f1", role: "finance", permissions: ["audit.read"] };

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentAdmin.mockResolvedValue(finance);
  GET_API.mockResolvedValue({ data: "id,reason\r\n1,=cmd\r\n", response: new Response() });
});

describe("GET /api/export/audit", () => {
  it("rejects anonymous and other roles without calling the API", async () => {
    getCurrentAdmin.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
    getCurrentAdmin.mockResolvedValue({ id: "s", role: "support", permissions: ["audit.read"] });
    expect((await call()).status).toBe(403);
    expect(GET_API).not.toHaveBeenCalled();
  });

  it("rejects a reversed range", async () => {
    expect((await call("from=2026-11-03&to=2026-11-01")).status).toBe(422);
    expect(GET_API).not.toHaveBeenCalled();
  });

  it("passes the filters and returns a safe, uncached attachment", async () => {
    const res = await call("from=2026-11-01&to=2026-11-02&area=user.");
    expect(GET_API.mock.calls[0][1].params.query).toMatchObject({ from_date: "2026-11-01", to_date: "2026-11-02", action: "user." });
    expect(getApiClient).toHaveBeenCalledWith({ timeoutMs: 60_000 });
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="audit_log_2026-11-01_2026-11-02.csv"');
    expect(await res.text()).toBe('"id","reason"\r\n"1","\'=cmd"\r\n');
  });

  it("explains the row limit", async () => {
    GET_API.mockResolvedValue({ error: { code: "MAX_EXPORT_EXCEEDED" }, response: new Response(null, { status: 422 }) });
    const res = await call();
    expect(res.status).toBe(422);
    expect((await res.json()).message).toContain("10,000");
  });

  it("hides other failures behind a generic message", async () => {
    GET_API.mockRejectedValue(new Error("boom: secret"));
    const res = await call();
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("secret");
  });
});
