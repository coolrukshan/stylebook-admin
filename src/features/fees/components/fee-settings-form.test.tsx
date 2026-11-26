import Link from "next/link";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axeViolations } from "@/test/axe";
import type { FeeSettings } from "../schemas";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const saveFees = vi.fn();
vi.mock("../actions", () => ({ saveFees: (...a: unknown[]) => saveFees(...a) }));
const { toast } = await import("sonner");
const { FeeSettingsForm, FeeSettingsReadOnly } = await import("./fee-settings-form");

const settings: FeeSettings = {
  service_commission_percent: 8,
  product_commission_percent: 10,
  deposit_default_percent: 30,
  max_no_show_fee_percent: 50,
  ai_credit_price_cents: 5000,
  updated_at: "2026-11-01T00:00:00Z",
};
const input = (name: string) => screen.getByRole("spinbutton", { name });
const save = () => screen.getByRole("button", { name: "Save changes" });
const plus = () => screen.getByRole("button", { name: "Increase Commission on services" });

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("FeeSettingsForm", () => {
  it("starts clean with Save disabled and truthful copy", () => {
    render(<FeeSettingsForm settings={settings} />);
    expect(save()).toBeDisabled();
    expect(screen.queryByText("Unsaved changes")).toBeNull();
    expect(screen.getByText(/including to existing bookings/)).toBeInTheDocument();
    expect(screen.queryByText(/notice/i)).toBeNull();
  });

  it("steps with buttons and arrow keys, and resets", async () => {
    render(<FeeSettingsForm settings={settings} />);
    await userEvent.click(plus());
    expect(input("Commission on services")).toHaveValue("9");
    await userEvent.type(input("Commission on services"), "{ArrowUp}");
    expect(input("Commission on services")).toHaveAttribute("aria-valuenow", "10");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(input("Commission on services")).toHaveValue("8");
    expect(save()).toBeDisabled();
  });

  it("disables buttons at the limits", () => {
    render(<FeeSettingsForm settings={{ ...settings, service_commission_percent: 50, deposit_default_percent: 0 }} />);
    expect(plus()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decrease Default deposit for new clients" })).toBeDisabled();
  });

  it("flags invalid typed input and blocks Save", async () => {
    render(<FeeSettingsForm settings={settings} />);
    const field = input("Commission on services");
    await userEvent.clear(field);
    await userEvent.type(field, "75");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("0 to 50");
    expect(save()).toBeDisabled();
  });

  it("confirms old to new, then sends only changed values with money in cents", async () => {
    saveFees.mockResolvedValue({ ok: true, data: { ...settings, ai_credit_price_cents: 6250, updated_at: "2026-11-02T00:00:00Z" } });
    render(<FeeSettingsForm settings={settings} />);
    await userEvent.clear(input("AI credit price"));
    await userEvent.type(input("AI credit price"), "62.50");
    await userEvent.click(save());
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("LKR 50 → LKR 62.50")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Salons are not notified");
    expect(within(dialog).queryByText(/Commission on services/)).toBeNull();
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirm and save" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Fees saved"));
    expect(saveFees).toHaveBeenCalledWith({ ai_credit_price_cents: 6250 }, expect.any(String));
    expect(save()).toBeDisabled();
  });

  it("keeps the edited values when saving fails", async () => {
    saveFees.mockResolvedValue({
      ok: false,
      error: { status: 500, code: "X", message: "Safe copy.", field: null, requestId: null, retryAfterSeconds: null },
    });
    render(<FeeSettingsForm settings={settings} />);
    await userEvent.click(plus());
    await userEvent.click(save());
    await userEvent.click(await screen.findByRole("button", { name: "Confirm and save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Safe copy.");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(input("Commission on services")).toHaveValue("9"));
  });

  it("warns when settings change underneath unsaved edits, but adopts them when clean", async () => {
    const newer = { ...settings, product_commission_percent: 12, updated_at: "2026-11-03T00:00:00Z" };
    const clean = render(<FeeSettingsForm settings={settings} />);
    clean.rerender(<FeeSettingsForm settings={newer} />);
    expect(input("Commission on products")).toHaveValue("12");
    clean.unmount();

    const dirty = render(<FeeSettingsForm settings={settings} />);
    await userEvent.click(plus());
    dirty.rerender(<FeeSettingsForm settings={newer} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Settings changed");
    expect(input("Commission on services")).toHaveValue("9");
  });

  it("asks before following a link with unsaved changes", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const followed = vi.fn((e: React.MouseEvent) => e.preventDefault());
    render(
      <>
        <Link href="/users" onClick={followed}>
          Users
        </Link>
        <FeeSettingsForm settings={settings} />
      </>,
    );
    await userEvent.click(plus());
    await userEvent.click(screen.getByRole("link", { name: "Users" }));
    expect(confirm).toHaveBeenCalled();
    expect(followed).not.toHaveBeenCalled();
  });

  it("shows values as text for view-only admins", () => {
    render(<FeeSettingsReadOnly settings={settings} />);
    expect(screen.getByText("LKR 50")).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("has no axe violations", async () => {
    const { container } = render(<FeeSettingsForm settings={settings} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
