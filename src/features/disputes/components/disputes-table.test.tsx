import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axeViolations } from "@/test/axe";
import type { DisputeRow } from "./disputes-table";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }), usePathname: () => "/disputes" }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const decide = vi.fn();
const status = vi.fn();
vi.mock("../actions", () => ({
  decideDispute: (...a: unknown[]) => decide(...a),
  getDisputeStatus: (...a: unknown[]) => status(...a),
}));
const { toast } = await import("sonner");
const { DisputesTable } = await import("./disputes-table");

const row = (o: Partial<DisputeRow>): DisputeRow => ({
  id: "d1",
  code: "3F2B8C1E",
  openedLabel: "Opened 3 days ago",
  client: "Tharindu J.",
  salon: "RedBox Barber",
  issue: "Service was not as described",
  category: "service_quality",
  offeredCents: null,
  reply: { kind: "none_after_48h" },
  status: "admin_review",
  state: "needs_decision",
  hoursLeft: 0,
  ...o,
});

function setup(rows: DisputeRow[] = [row({})], canDecide = true) {
  return render(
    <NuqsTestingAdapter>
      <DisputesTable rows={rows} canDecide={canDecide} />
    </NuqsTestingAdapter>,
  );
}
const refundFlow = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Full refund for 3F2B8C1E" }));
  await userEvent.click(await screen.findByRole("button", { name: "Salon did not respond" }));
  await userEvent.click(screen.getByRole("button", { name: "Refund in full" }));
};

beforeEach(() => vi.clearAllMocks());

describe("DisputesTable", () => {
  it("shows status, reply, no amount and an offer when present", () => {
    setup([row({ offeredCents: 100000, reply: { kind: "replied", text: "We will refund" } })]);
    expect(screen.getByText("Needs decision")).toBeInTheDocument();
    expect(screen.getByText(/We will refund/)).toBeInTheDocument();
    expect(screen.getByText("Offered LKR 1,000")).toBeInTheDocument();
  });

  it("enables Full refund and Reject for Needs decision, with 50% unavailable", () => {
    setup();
    expect(screen.getByRole("button", { name: "Full refund for 3F2B8C1E" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Reject for 3F2B8C1E" })).toBeEnabled();
    const half = screen.getByRole("button", { name: "50% for 3F2B8C1E" });
    expect(half).toBeDisabled();
    expect(half).toHaveAccessibleDescription(/not available yet/);
  });

  it("disables everything inside the salon window and shows the hours left", () => {
    setup([row({ status: "salon_review", state: "salon_window", hoursLeft: 46, reply: { kind: "waiting" } })]);
    for (const name of ["Full refund", "50%", "Reject"]) expect(screen.getByRole("button", { name })).toBeDisabled();
    expect(screen.getByText("Salon has 46 h left")).toBeInTheDocument();
  });

  it("shows no decision buttons for decided disputes or without permission", () => {
    const { unmount } = setup([row({ status: "resolved", state: "decided" })]);
    expect(screen.queryByRole("button", { name: /refund|Reject/i })).toBeNull();
    unmount();
    setup([row({})], false);
    expect(screen.queryByRole("button", { name: /refund|Reject/i })).toBeNull();
  });

  it("sends a full refund with the chosen reason and no amount", async () => {
    decide.mockResolvedValue({ ok: true, data: { status: "resolved" } });
    setup();
    await refundFlow();
    await waitFor(() => expect(decide).toHaveBeenCalledWith("d1", "full_refund", "Salon did not respond", expect.any(String)));
    expect(toast.success).toHaveBeenCalledWith("Full refund issued");
  });

  it("rejects through the reason dialog", async () => {
    decide.mockResolvedValue({ ok: true, data: { status: "rejected" } });
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Reject for 3F2B8C1E" }));
    await userEvent.click(await screen.findByRole("button", { name: "Not enough evidence" }));
    await userEvent.click(screen.getByRole("button", { name: "Reject dispute" }));
    await waitFor(() => expect(decide).toHaveBeenCalledWith("d1", "reject", "Not enough evidence", expect.any(String)));
  });

  it("treats a timeout as done when the dispute is already decided", async () => {
    decide.mockResolvedValue({ ok: false, error: { status: 0, code: "NETWORK_ERROR", message: "x", field: null, requestId: null, retryAfterSeconds: null } });
    status.mockResolvedValue({ ok: true, data: { status: "resolved" } });
    setup();
    await refundFlow();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Full refund issued"));
  });

  it("keeps the dialog open with a clear message when a timeout did not land", async () => {
    decide.mockResolvedValue({ ok: false, error: { status: 0, code: "NETWORK_ERROR", message: "x", field: null, requestId: null, retryAfterSeconds: null } });
    status.mockResolvedValue({ ok: true, data: { status: "admin_review" } });
    setup();
    await refundFlow();
    expect(await screen.findByRole("alert")).toHaveTextContent("It has not been applied yet");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = setup();
    expect(await axeViolations(container)).toEqual([]);
  });
});
