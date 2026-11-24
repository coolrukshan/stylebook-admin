import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axeViolations } from "@/test/axe";
import type { PayoutAccount } from "../schemas";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }), usePathname: () => "/payouts/accounts" }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const reveal = vi.fn();
const verify = vi.fn();
const reject = vi.fn();
vi.mock("../actions", () => ({
  revealPayoutAccount: (...a: unknown[]) => reveal(...a),
  verifyPayoutAccount: (...a: unknown[]) => verify(...a),
  rejectPayoutAccount: (...a: unknown[]) => reject(...a),
}));
const { AccountsTable } = await import("./accounts-table");

const base = {
  salon_id: "s",
  bank_name: "Commercial Bank",
  branch: "Kollupitiya",
  verified: false,
  verified_at: null,
  rejected_at: null,
  created_at: "2026-10-20T00:00:00Z",
};
const accounts: PayoutAccount[] = [
  { ...base, id: "a1", salon_name: "RedBox Barber", account_name: "RedBox", account_last4: "4821" },
  { ...base, id: "a2", salon_name: "Glow Studio", account_name: "Glow", account_last4: "1177", verified: true, verified_at: "2026-08-12T00:00:00Z" },
];

function setup(props: Partial<{ canReveal: boolean; canVerify: boolean }> = {}) {
  return render(
    <NuqsTestingAdapter>
      <QueryClientProvider client={new QueryClient()}>
        <AccountsTable accounts={accounts} nextCursor={null} canReveal canVerify filtered={false} {...props} />
      </QueryClientProvider>
    </NuqsTestingAdapter>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("AccountsTable", () => {
  it("shows masks from last4, statuses and pending-only actions", () => {
    setup();
    expect(screen.getByText("•••• •••• 4821")).toBeInTheDocument();
    expect(screen.getByText("Verified 12 Aug")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify for RedBox Barber" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verify for Glow Studio" })).toBeNull();
    expect(screen.getAllByRole("button", { name: /Reveal account number/ })).toHaveLength(2);
  });

  it("hides actions the admin lacks permission for", () => {
    setup({ canReveal: false, canVerify: false });
    expect(screen.queryByRole("button", { name: /Reveal/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Verify|Reject/ })).toBeNull();
  });

  it("reveals one row at a time", async () => {
    reveal.mockImplementation(async (id: string) => ({ ok: true, data: `full-${id}` }));
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Reveal account number for RedBox Barber" }));
    expect(await screen.findByText("full-a1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reveal account number for Glow Studio" }));
    expect(await screen.findByText("full-a2")).toBeInTheDocument();
    expect(screen.queryByText("full-a1")).toBeNull();
  });

  it("verifies without a dialog and refreshes", async () => {
    verify.mockResolvedValue({ ok: true, data: { id: "a1" } });
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Verify for RedBox Barber" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(verify).toHaveBeenCalledWith("a1", expect.any(String));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("rejects through the reason dialog with the chosen label", async () => {
    reject.mockResolvedValue({ ok: true, data: { id: "a1" } });
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Reject for RedBox Barber" }));
    await userEvent.click(await screen.findByRole("button", { name: "Suspected fraud" }));
    await userEvent.click(screen.getByRole("button", { name: "Reject account" }));
    await waitFor(() => expect(reject).toHaveBeenCalledWith("a1", "Suspected fraud", expect.any(String)));
  });

  it("has no axe violations", async () => {
    const { container } = setup();
    expect(await axeViolations(container)).toEqual([]);
  });
});
