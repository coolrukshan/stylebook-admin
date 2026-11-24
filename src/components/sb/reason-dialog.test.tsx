import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/lib/api/errors";
import { axeViolations } from "@/test/axe";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
const { toast } = await import("sonner");
const { ReasonDialog } = await import("./reason-dialog");
const { reasonDialogs } = await import("./reason-presets");

const ok: ActionResult<unknown> = { ok: true, data: undefined };
const fail = (status: number): ActionResult<unknown> => ({
  ok: false,
  error: { status, code: "X", message: "Safe copy.", field: null, requestId: "req-7", retryAfterSeconds: null },
});

function setup(onConfirm = vi.fn(async (_r: string, _k: string) => ok), config = reasonDialogs.suspendUser("Nimal Perera")) {
  render(<ReasonDialog {...config} trigger={<button>Suspend</button>} onConfirm={onConfirm} />);
  return onConfirm;
}
const open = () => userEvent.click(screen.getByRole("button", { name: "Suspend" }));
const confirm = () => screen.getByRole("button", { name: "Suspend user" });

beforeEach(() => vi.clearAllMocks());

describe("ReasonDialog", () => {
  it("renders title, note and chips; confirm disabled until a reason is chosen", async () => {
    setup();
    await open();
    expect(await screen.findByRole("dialog", { name: "Suspend Nimal Perera?" })).toBeInTheDocument();
    expect(screen.getByText(/upcoming bookings are cancelled/)).toBeInTheDocument();
    expect(confirm()).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Payment fraud" }));
    await waitFor(() => expect(confirm()).toBeEnabled());
  });

  it("focuses the first chip on open", async () => {
    setup();
    await open();
    await waitFor(() => expect(screen.getByRole("button", { name: "Spam or fake reviews" })).toHaveFocus());
  });

  it("selection is exposed by aria-pressed and a check icon, single select", async () => {
    setup();
    await open();
    const fraud = await screen.findByRole("button", { name: "Payment fraud" });
    const abusive = screen.getByRole("button", { name: "Abusive to staff" });
    await userEvent.click(fraud);
    expect(fraud).toHaveAttribute("aria-pressed", "true");
    expect(fraud.querySelector("svg")).not.toBeNull();
    await userEvent.click(abusive);
    expect(fraud).toHaveAttribute("aria-pressed", "false");
    expect(abusive).toHaveAttribute("aria-pressed", "true");
  });

  it("Other requires 10 characters", async () => {
    setup();
    await open();
    await userEvent.click(await screen.findByRole("button", { name: "Other" }));
    expect(confirm()).toBeDisabled();
    const box = screen.getByRole("textbox", { name: "Describe the reason" });
    await userEvent.type(box, "too short");
    await waitFor(() => expect(confirm()).toBeDisabled());
    await userEvent.type(box, "!!");
    await waitFor(() => expect(confirm()).toBeEnabled());
  });

  it("sends only the preset label as reason, plus a stable idempotency key", async () => {
    const onConfirm = setup();
    await open();
    await userEvent.click(await screen.findByRole("button", { name: "Payment fraud" }));
    await waitFor(() => expect(confirm()).toBeEnabled());
    await userEvent.click(confirm());
    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce());
    const [reason, key] = onConfirm.mock.calls[0];
    expect(reason).toBe("Payment fraud");
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("sends trimmed free text for Other", async () => {
    const onConfirm = setup();
    await open();
    await userEvent.click(await screen.findByRole("button", { name: "Other" }));
    await userEvent.type(screen.getByRole("textbox"), "  Repeated harassment of staff  ");
    await waitFor(() => expect(confirm()).toBeEnabled());
    await userEvent.click(confirm());
    await waitFor(() => expect(onConfirm.mock.calls[0]?.[0]).toBe("Repeated harassment of staff"));
  });

  it("Esc sends nothing", async () => {
    const onConfirm = setup();
    await open();
    await userEvent.click(await screen.findByRole("button", { name: "Payment fraud" }));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("Cancel sends nothing and returns focus to the trigger", async () => {
    const onConfirm = setup();
    await open();
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Suspend" })).toHaveFocus());
  });

  it("double-click submits once", async () => {
    let resolve!: (r: ActionResult<unknown>) => void;
    const onConfirm = vi.fn(() => new Promise<ActionResult<unknown>>((r) => { resolve = r; }));
    setup(onConfirm);
    await open();
    await userEvent.click(await screen.findByRole("button", { name: "Payment fraud" }));
    await waitFor(() => expect(confirm()).toBeEnabled());
    await userEvent.dblClick(confirm());
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled();
    resolve(ok);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("shows API failure inline with the request id, stays open, and retry reuses the key", async () => {
    const onConfirm = vi.fn(async (_r: string, _k: string) => fail(500));
    setup(onConfirm);
    await open();
    await userEvent.click(await screen.findByRole("button", { name: "Payment fraud" }));
    await waitFor(() => expect(confirm()).toBeEnabled());
    await userEvent.click(confirm());
    expect(await screen.findByRole("alert")).toHaveTextContent("req-7");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.click(confirm());
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(2));
    expect(onConfirm.mock.calls[1][1]).toBe(onConfirm.mock.calls[0][1]);
  });

  it("409 closes the dialog with a stale toast and refreshes", async () => {
    setup(vi.fn(async () => fail(409)));
    await open();
    await userEvent.click(await screen.findByRole("button", { name: "Payment fraud" }));
    await waitFor(() => expect(confirm()).toBeEnabled());
    await userEvent.click(confirm());
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(refresh).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("shows 'The owner will see this' only for owner-visible dialogs", async () => {
    setup(undefined, reasonDialogs.rejectSalon("Glow Studio") as never);
    await open();
    expect(await screen.findByText("The owner will see this.")).toBeInTheDocument();
  });

  it("has no axe violations (open, Other selected)", async () => {
    setup();
    await open();
    await userEvent.click(await screen.findByRole("button", { name: "Other" }));
    const dialog = screen.getByRole("dialog");
    expect(await axeViolations(dialog)).toEqual([]);
  });
});
