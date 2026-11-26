import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axeViolations } from "@/test/axe";
import type { FeeOverride } from "../schemas";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const save = vi.fn();
const remove = vi.fn();
const search = vi.fn();
vi.mock("../actions", () => ({
  saveOverride: (...a: unknown[]) => save(...a),
  removeOverride: (...a: unknown[]) => remove(...a),
  searchSalons: (...a: unknown[]) => search(...a),
}));
const { OverridesCard } = await import("./overrides-card");
const { ExampleCard } = await import("./example-card");

const o: FeeOverride = { id: "s1", salon_id: "s1", salon_name: "Looks Unisex Salon", service_commission_percent: 6, product_commission_percent: 8 };
const card = (p: Partial<React.ComponentProps<typeof OverridesCard>> = {}) =>
  render(<OverridesCard overrides={[o]} canChange canSearchSalons mayHaveMore={false} {...p} />);

beforeEach(() => vi.clearAllMocks());

describe("OverridesCard", () => {
  it("lists rates and shows the empty state", () => {
    const { unmount } = card();
    expect(screen.getByText("6% services · 8% products")).toBeInTheDocument();
    unmount();
    card({ overrides: [] });
    expect(screen.getByRole("status")).toHaveTextContent("No salon overrides");
  });

  it("is read-only without fees.change", () => {
    card({ canChange: false });
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("disables Add when salons can't be searched, keeping Edit and Remove", () => {
    card({ canSearchSalons: false });
    expect(screen.getByRole("button", { name: "Add override" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit override for Looks Unisex Salon" })).toBeEnabled();
  });

  it("edits one rate and still sends both", async () => {
    save.mockResolvedValue({ ok: true, data: { salonId: "s1" } });
    card();
    await userEvent.click(screen.getByRole("button", { name: "Edit override for Looks Unisex Salon" }));
    const service = await screen.findByLabelText("Service commission (%)");
    await userEvent.clear(service);
    await userEvent.type(service, "5");
    await userEvent.click(screen.getByRole("button", { name: "Save override" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ salonId: "s1", service: 5, product: 8 }, expect.any(String)));
  });

  it("adds an override after picking a salon", async () => {
    search.mockResolvedValue({ ok: true, data: [{ id: "s2", name: "Glow Studio", city: "Kandy" }] });
    save.mockResolvedValue({ ok: true, data: { salonId: "s2" } });
    card();
    await userEvent.click(screen.getByRole("button", { name: "Add override" }));
    await userEvent.type(await screen.findByLabelText("Salon"), "glow");
    await userEvent.click(await screen.findByRole("button", { name: /Glow Studio/ }));
    expect(screen.getByRole("button", { name: "Save override" })).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Service commission (%)"), "4");
    await userEvent.click(screen.getByRole("button", { name: "Save override" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ salonId: "s2", service: 4, product: null }, expect.any(String)));
  });

  it("removes after confirmation", async () => {
    remove.mockResolvedValue({ ok: true, data: { id: "s1" } });
    card();
    await userEvent.click(screen.getByRole("button", { name: "Remove override for Looks Unisex Salon" }));
    expect(remove).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole("button", { name: "Remove override" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith("s1", expect.any(String)));
  });

  it("shows the example as unavailable, with no invented amounts", async () => {
    const { container } = render(<ExampleCard />);
    expect(screen.getAllByText("Not available yet")).toHaveLength(4);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("has no axe violations", async () => {
    const { container } = card();
    expect(await axeViolations(container)).toEqual([]);
  });
});
