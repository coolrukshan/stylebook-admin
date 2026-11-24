import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatCards } from "./stat-cards";

describe("StatCards", () => {
  it("shows the three titles with an honest placeholder and no invented numbers", () => {
    render(<StatCards />);
    for (const t of ["Refunds this week", "Solved by salons in 48 h", "Chargebacks"]) expect(screen.getByText(t)).toBeInTheDocument();
    expect(screen.getAllByText("Not available yet")).toHaveLength(3);
  });
});
