import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axeViolations } from "@/test/axe";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const approve = vi.fn();
const reject = vi.fn();
const info = vi.fn();
vi.mock("../actions", () => ({
  approveApplication: (...a: unknown[]) => approve(...a),
  rejectApplication: (...a: unknown[]) => reject(...a),
  requestApplicationInfo: (...a: unknown[]) => info(...a),
}));
const { toast } = await import("sonner");
const { DecisionActions } = await import("./decision-actions");
const { DocumentTile } = await import("./document-viewer");

const ok = { ok: true, data: { status: "approved" } };
const stale = {
  ok: false,
  error: { status: 409, code: "CONFLICT", message: "Already handled.", field: null, requestId: "r1", retryAfterSeconds: null },
};

function setup(nextId: string | null = "next-1") {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <DecisionActions id="app-1" salon="Glow Studio" nextId={nextId} />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("DecisionActions", () => {
  it("approves without a dialog, toasts and moves to the next application", async () => {
    approve.mockResolvedValue(ok);
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/applications/next-1"));
    expect(approve).toHaveBeenCalledWith("app-1", expect.any(String));
    expect(toast.success).toHaveBeenCalledWith("Glow Studio approved");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("goes back to the list when the queue is empty", async () => {
    approve.mockResolvedValue(ok);
    setup(null);
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/applications"));
  });

  it("shows a 409 toast and refreshes instead of navigating", async () => {
    approve.mockResolvedValue(stale);
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("rejects through the reason dialog, sending the label", async () => {
    reject.mockResolvedValue(ok);
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Reject" }));
    await userEvent.click(await screen.findByRole("button", { name: "Documents invalid" }));
    await userEvent.click(screen.getByRole("button", { name: "Reject application" }));
    await waitFor(() => expect(reject).toHaveBeenCalledWith("app-1", "Documents invalid", expect.any(String)));
    expect(toast.success).toHaveBeenCalledWith("Glow Studio rejected");
  });

  it("requires free text for Other on request info", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Request info" }));
    await userEvent.click(await screen.findByRole("button", { name: "Other" }));
    expect(screen.getByRole("button", { name: "Send request" })).toBeDisabled();
    expect(info).not.toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = setup();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("DocumentTile", () => {
  it("is not interactive when missing", () => {
    render(<DocumentTile applicationId="a" label="Proof of address" state="missing" items={[]} />);
    expect(screen.getByText("Missing")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens received photos through the server proxy and pages with arrow keys", async () => {
    render(
      <DocumentTile
        applicationId="a1"
        label="Salon photos (2)"
        state="received"
        items={[
          { index: 3, label: "p1" },
          { index: 4, label: "p2" },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Open Salon photos (2)" }));
    const img = await screen.findByRole("img", { name: "Photo 1 of 2" });
    expect(img).toHaveAttribute("src", "/api/applications/a1/documents/3");
    await userEvent.keyboard("{ArrowRight}");
    expect(await screen.findByRole("img", { name: "Photo 2 of 2" })).toHaveAttribute("src", "/api/applications/a1/documents/4");
  });
});
