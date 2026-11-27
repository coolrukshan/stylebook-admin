import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axeViolations } from "@/test/axe";
import type { EngagementStats } from "../schemas";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const reset = vi.fn();
vi.mock("../actions", () => ({ resetHoldout: (...a: unknown[]) => reset(...a) }));
const { toast } = await import("sonner");
const { KpiCards } = await import("./kpi-cards");
const { RebookingChart } = await import("./rebooking-chart");
const { SettingsCard } = await import("./settings-card");

const stats: EngagementStats = {
  total_nudges_sent: 7820,
  total_nudges_opened: 2970,
  total_nudges_converted: 2100,
  overall_open_rate: 0.38,
  overall_conversion_rate: 0.27,
  holdout_group: { size: 860, organic_return_rate: 0.14, treatment_return_rate: 0.27, lift: 0.93 },
};
const input = () => screen.getByLabelText("New holdout percentage");
const trigger = () => screen.getByRole("button", { name: "Reset holdout group" });

beforeEach(() => vi.clearAllMocks());

describe("KpiCards", () => {
  it("shows real numbers and honest placeholders", () => {
    render(<KpiCards stats={stats} />);
    expect(screen.getByText("7,820")).toBeInTheDocument();
    expect(screen.getByText("Holdout group: 860 clients")).toBeInTheDocument();
    expect(screen.getAllByText("Not available yet")).toHaveLength(2);
  });
});

describe("RebookingChart", () => {
  it("labels both arms with values and offers a table", async () => {
    const { container } = render(<RebookingChart stats={stats} />);
    expect(screen.getByText("+93% relative lift")).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveTextContent("Nudged");
    expect(screen.getByRole("table")).toHaveTextContent("14%");
    expect(screen.queryByText(/pts/)).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });
  it("handles no holdout", () => {
    render(<RebookingChart stats={{ ...stats, holdout_group: { ...stats.holdout_group, size: 0 } }} />);
    expect(screen.getByText("No holdout, uplift unavailable")).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveTextContent("No holdout");
  });
  it("handles an engine with no sends", () => {
    render(<RebookingChart stats={{ ...stats, total_nudges_sent: 0 }} />);
    expect(screen.getByRole("status")).toHaveTextContent("No nudges sent in the last 30 days");
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("SettingsCard", () => {
  it("shows no reset without permission and no invented settings", () => {
    render(<SettingsCard canReset={false} />);
    expect(screen.getAllByText("Not available yet")).toHaveLength(6);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("keeps the percentage within 1 to 50", async () => {
    render(<SettingsCard canReset />);
    await userEvent.clear(input());
    await userEvent.type(input(), "50");
    expect(screen.getByRole("button", { name: "Increase holdout percentage" })).toBeDisabled();
    await userEvent.clear(input());
    await userEvent.type(input(), "0");
    expect(screen.getByRole("alert")).toHaveTextContent("1 to 50");
    expect(trigger()).toBeDisabled();
  });

  it("warns what is destroyed, then sends percentage and reason once", async () => {
    reset.mockResolvedValue({ ok: true, data: { previous_holdout_size: 860, new_holdout_size: 1290, holdout_percentage: 11 } });
    render(<SettingsCard canReset />);
    await userEvent.click(screen.getByRole("button", { name: "Increase holdout percentage" }));
    await userEvent.click(trigger());
    const dialog = await screen.findByRole("dialog", { name: "Reset the holdout group at 11%?" });
    expect(dialog).toHaveTextContent("deletes the current holdout group");
    expect(dialog).toHaveTextContent("drawn at the engine's default");
    expect(reset).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Restart the measurement" }));
    await userEvent.dblClick(screen.getByRole("button", { name: "Reset holdout" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Holdout reset: 860 → 1,290 clients"));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledWith(11, "Restart the measurement", expect.any(String));
  });

  it("keeps the dialog open when the reset fails", async () => {
    reset.mockResolvedValue({
      ok: false,
      error: { status: 500, code: "X", message: "Safe copy.", field: null, requestId: null, retryAfterSeconds: null },
    });
    render(<SettingsCard canReset />);
    await userEvent.click(trigger());
    await userEvent.click(await screen.findByRole("button", { name: "Change holdout size" }));
    await userEvent.click(screen.getByRole("button", { name: "Reset holdout" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Safe copy.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<SettingsCard canReset />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
