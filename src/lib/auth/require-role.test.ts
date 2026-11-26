import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentAdmin = vi.fn();
vi.mock("./current-admin", () => ({ getCurrentAdmin: () => getCurrentAdmin() }));
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
const forbidden = vi.fn(() => {
  throw new Error("FORBIDDEN_PAGE");
});
vi.mock("next/navigation", () => ({ redirect, forbidden }));

const { requirePermission, assertPermission } = await import("./require-role");

beforeEach(() => vi.clearAllMocks());

describe("requirePermission (pages)", () => {
  it("returns the admin when allowed", async () => {
    getCurrentAdmin.mockResolvedValue({ role: "finance", permissions: ["fees.manage"] });
    await expect(requirePermission("fees.change")).resolves.toMatchObject({ role: "finance" });
  });
  it("renders 403 when the permission is missing", async () => {
    getCurrentAdmin.mockResolvedValue({ role: "support", permissions: [] });
    await expect(requirePermission("fees.change")).rejects.toThrow("FORBIDDEN_PAGE");
  });
  it("redirects anonymous to /login", async () => {
    getCurrentAdmin.mockResolvedValue(null);
    await expect(requirePermission("fees.change")).rejects.toThrow("REDIRECT:/login");
  });
});

describe("assertPermission (actions)", () => {
  it("throws ApiError 403 instead of a page", async () => {
    getCurrentAdmin.mockResolvedValue({ role: "support", permissions: [] });
    await expect(assertPermission("fees.change")).rejects.toMatchObject({ status: 403 });
    expect(forbidden).not.toHaveBeenCalled();
  });
  it("redirects anonymous", async () => {
    getCurrentAdmin.mockResolvedValue(null);
    await expect(assertPermission("fees.change")).rejects.toThrow("REDIRECT:/login");
  });
});
