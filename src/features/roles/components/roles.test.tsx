import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axeViolations } from "@/test/axe";
import type { AdminRow } from "../schemas";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const update = vi.fn();
vi.mock("../actions", () => ({ updateAdminAccess: (...a: unknown[]) => update(...a) }));
const { AdminsTable } = await import("./admins-table");

const row = (p: Partial<AdminRow>): AdminRow => ({
  id: "a1",
  name: "Dinusha Perera",
  role: "support",
  permissions: ["users.read"],
  active: true,
  twoFactor: true,
  lastSignInAt: "2026-10-25T04:00:00Z",
  ...p,
});
const admins = [
  row({ id: "s", name: "Ayesha W", role: "super_admin", permissions: [] }),
  row({}),
  row({ id: "m", name: "Ishan Rodrigo", role: "moderator", twoFactor: false, active: false, lastSignInAt: null }),
];
const open = () => userEvent.click(screen.getByRole("button", { name: "Edit access for Dinusha Perera" }));

beforeEach(() => vi.clearAllMocks());

describe("AdminsTable", () => {
  it("shows role, 2FA, sign-in and status, and locks the Super admin", async () => {
    const { container } = render(<AdminsTable admins={admins} />);
    expect(screen.getByText("All permissions (locked)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit access for Ayesha W" })).toBeNull();
    const off = screen.getByRole("row", { name: /Ishan Rodrigo/ });
    expect(off).toHaveTextContent("Off");
    expect(off).toHaveTextContent("Never");
    expect(off).toHaveTextContent("Deactivated");
    expect(screen.getByRole("row", { name: /Dinusha/ })).toHaveTextContent("25 Oct 2026");
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("AccessDialog", () => {
  it("reviews added and removed permissions, then sends only those", async () => {
    update.mockResolvedValue({ ok: true, data: { id: "a1" } });
    render(<AdminsTable admins={admins} />);
    await open();
    expect(screen.getByRole("button", { name: "Review changes" })).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: "Dinusha Perera: View users" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Dinusha Perera: Suspend and reactivate users" }));
    await userEvent.click(screen.getByRole("button", { name: "Review changes" }));
    expect(within(screen.getByRole("list", { name: "Added" })).getByText("Suspend and reactivate users")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Removed" })).getByText("View users")).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Confirm changes" }));
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0]).toEqual({ adminId: "a1", grant: ["users.suspend"], revoke: ["users.read"] });
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("can't grant roles.manage", async () => {
    render(<AdminsTable admins={admins} />);
    await open();
    expect(screen.getByRole("checkbox", { name: "Dinusha Perera: Manage admins and roles" })).toBeDisabled();
    expect(await axeViolations(screen.getByRole("dialog"))).toEqual([]);
  });

  it("lets an existing roles.manage be removed and restored", async () => {
    render(<AdminsTable admins={[row({ permissions: ["roles:manage"] })]} />);
    await open();
    const box = screen.getByRole("checkbox", { name: "Dinusha Perera: Manage admins and roles" });
    expect(box).toBeChecked();
    await userEvent.click(box);
    expect(box).toBeEnabled();
    await userEvent.click(box);
    expect(screen.getByRole("button", { name: "Review changes" })).toBeDisabled();
  });

  it("keeps the dialog open when saving fails", async () => {
    update.mockResolvedValue({ ok: false, error: { status: 500, message: "Something went wrong" } });
    render(<AdminsTable admins={admins} />);
    await open();
    await userEvent.click(screen.getByRole("checkbox", { name: "Dinusha Perera: View users" }));
    await userEvent.click(screen.getByRole("button", { name: "Review changes" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
