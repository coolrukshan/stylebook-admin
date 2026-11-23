import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/lib/api/errors";
import { axeViolations } from "@/test/axe";

let pathname = "/payout-accounts";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
const { MaskedValue, REVEAL_TIMEOUT_MS } = await import("./masked-value");

const ok = (v: string): Promise<ActionResult<string>> => Promise.resolve({ ok: true, data: v });

describe("MaskedValue", () => {
  beforeEach(() => { pathname = "/payout-accounts"; });
  afterEach(() => vi.useRealTimers());

  it("shows only the masked value and no button when reveal is unavailable", () => {
    render(<MaskedValue masked="a***@b.lk" label="email" subject="Ayesha" />);
    expect(screen.getByText("a***@b.lk")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("reveals via the audited action, names the subject, and hides on demand", async () => {
    const reveal = vi.fn(() => ok("1234567890124821"));
    render(<MaskedValue masked="•••• 4821" label="account number" subject="RedBox Barber" reveal={reveal} />);
    await userEvent.click(screen.getByRole("button", { name: "Reveal account number for RedBox Barber" }));
    expect(reveal).toHaveBeenCalledOnce();
    expect(await screen.findByText("1234567890124821")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Hide account number for RedBox Barber" }));
    expect(screen.queryByText("1234567890124821")).toBeNull();
    expect(screen.getByText("•••• 4821")).toBeInTheDocument();
  });

  it("auto-hides after 60 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<MaskedValue masked="•••• 4821" label="account number" subject="X" reveal={() => ok("SECRET")} />);
    await userEvent.click(screen.getByRole("button", { name: /Reveal/ }));
    expect(await screen.findByText("SECRET")).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(REVEAL_TIMEOUT_MS - 1000); });
    expect(screen.getByText("SECRET")).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(screen.queryByText("SECRET")).toBeNull();
  });

  it("hides on navigation", async () => {
    const view = render(<MaskedValue masked="•••• 4821" label="account number" subject="X" reveal={() => ok("SECRET")} />);
    await userEvent.click(screen.getByRole("button", { name: /Reveal/ }));
    expect(await screen.findByText("SECRET")).toBeInTheDocument();
    pathname = "/users";
    view.rerender(<MaskedValue masked="•••• 4821" label="account number" subject="X" reveal={() => ok("SECRET")} />);
    expect(screen.queryByText("SECRET")).toBeNull();
  });

  it("drops the value on unmount", async () => {
    const view = render(<MaskedValue masked="•••• 4821" label="account number" subject="X" reveal={() => ok("SECRET")} />);
    await userEvent.click(screen.getByRole("button", { name: /Reveal/ }));
    await screen.findByText("SECRET");
    view.unmount();
    expect(document.body).not.toHaveTextContent("SECRET");
  });

  it("shows a safe inline error and keeps the value masked when reveal fails", async () => {
    const reveal = () =>
      Promise.resolve<ActionResult<string>>({
        ok: false,
        error: { status: 403, code: "FORBIDDEN", message: "You don't have permission to do that.", field: null, requestId: "r" },
      });
    render(<MaskedValue masked="•••• 4821" label="account number" subject="X" reveal={reveal} />);
    await userEvent.click(screen.getByRole("button", { name: /Reveal/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("permission");
    expect(screen.getByText("•••• 4821")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<MaskedValue masked="•••• 4821" label="account number" subject="X" reveal={() => ok("S")} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
