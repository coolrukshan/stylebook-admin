import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axeViolations } from "@/test/axe";
import type { PayoutRun } from "../schemas";
import { PayoutRunCard } from "./payout-run-card";

// Net deliberately differs from gross - commission - refunds: the card must show the API value.
const run: PayoutRun = {
  id: "r1",
  status: "completed",
  period_start: "2026-10-19T18:30:00Z",
  period_end: "2026-10-26T18:29:59Z",
  dry_run: false,
  total_cents: 892_040_000,
  commission_total_cents: 71_363_200,
  dispute_deductions_total_cents: 4_120_000,
  net_total_cents: 999_999_900,
  salon_count: 112,
  created_at: "2026-10-27T02:00:00Z",
  completed_at: null,
  lines: [],
};

describe("PayoutRunCard", () => {
  it("renders API values and never recomputes net", () => {
    render(<PayoutRunCard run={run} />);
    expect(screen.getByText("LKR 8,920,400")).toBeInTheDocument();
    expect(screen.getByText("LKR 713,632")).toBeInTheDocument();
    expect(screen.getByText("LKR 41,200")).toBeInTheDocument();
    expect(screen.getByText("LKR 9,999,999")).toBeInTheDocument();
    expect(screen.getByText("112")).toBeInTheDocument();
  });
  it("shows Approve and Export as disabled with an explanation", () => {
    render(<PayoutRunCard run={run} />);
    for (const name of ["Approve payout run", "Export bank file"]) {
      const b = screen.getByRole("button", { name });
      expect(b).toBeDisabled();
      expect(b).toHaveAccessibleDescription(/not available yet/);
    }
  });
  it("shows the empty state without a run", () => {
    render(<PayoutRunCard run={null} />);
    expect(screen.getByRole("status")).toHaveTextContent("No run for this week yet");
  });
  it("has no axe violations", async () => {
    const { container } = render(<PayoutRunCard run={run} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
