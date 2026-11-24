import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axeViolations } from "@/test/axe";
import type { UserRow } from "../map";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }), usePathname: () => "/users" }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const suspend = vi.fn();
const reactivate = vi.fn();
vi.mock("../actions", () => ({
  suspendUser: (...a: unknown[]) => suspend(...a),
  reactivateUser: (...a: unknown[]) => reactivate(...a),
}));
const { toast } = await import("sonner");
const { UsersTable } = await import("./users-table");

const row = (o: Partial<UserRow>): UserRow => ({
  id: "u1",
  name: "Nimal Perera",
  emailMasked: "n••••a@example.com",
  phoneMasked: "+94 77 ••• 4567",
  roleLabel: "Client",
  bookings: 14,
  joinedAt: "2026-02-10T00:00:00Z",
  status: "active",
  suspendedAt: null,
  canAct: true,
  ...o,
});
const rows = [
  row({}),
  row({ id: "u2", name: "Ayesha Silva", status: "suspended", suspendedAt: "2026-10-01T00:00:00Z" }),
  row({ id: "u3", name: "Staff Admin", canAct: false }),
];

function setup(props: Partial<{ canSuspend: boolean; rows: UserRow[]; query: string }> = {}) {
  return render(
    <NuqsTestingAdapter>
      <UsersTable rows={props.rows ?? rows} nextCursor={null} canSuspend={props.canSuspend ?? true} query={props.query ?? ""} />
    </NuqsTestingAdapter>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("UsersTable", () => {
  it("shows masked contact, joined month and status-specific actions", () => {
    setup();
    expect(screen.getAllByText("n••••a@example.com")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Feb 2026")[0]).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suspend for Nimal Perera" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reactivate for Ayesha Silva" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /for Staff Admin/ })).toBeNull();
  });

  it("hides actions without user.suspend", () => {
    setup({ canSuspend: false });
    expect(screen.queryByRole("button", { name: /Suspend|Reactivate/ })).toBeNull();
  });

  it("suspends through the reason dialog with the chosen label", async () => {
    suspend.mockResolvedValue({ ok: true, data: { id: "u1" } });
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Suspend for Nimal Perera" }));
    await userEvent.click(await screen.findByRole("button", { name: "Payment fraud" }));
    await userEvent.click(screen.getByRole("button", { name: "Suspend user" }));
    await waitFor(() => expect(suspend).toHaveBeenCalledWith("u1", "Payment fraud", expect.any(String)));
    expect(toast.success).toHaveBeenCalledWith("Nimal Perera suspended");
  });

  it("reactivates with a reason", async () => {
    reactivate.mockResolvedValue({ ok: true, data: { id: "u2" } });
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Reactivate for Ayesha Silva" }));
    await userEvent.click(await screen.findByRole("button", { name: "Appeal accepted" }));
    await userEvent.click(screen.getByRole("button", { name: "Reactivate user" }));
    await waitFor(() => expect(reactivate).toHaveBeenCalledWith("u2", "Appeal accepted", expect.any(String)));
  });

  it("shows the no-match message with the query", () => {
    setup({ rows: [], query: "zzz" });
    expect(screen.getByText('No users match "zzz"')).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = setup();
    expect(await axeViolations(container)).toEqual([]);
  });
});
