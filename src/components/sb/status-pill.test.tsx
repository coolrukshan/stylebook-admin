import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resolveStatus, StatusPill } from "./status-pill";

describe("StatusPill", () => {
  it.each([
    ["active", "Active", "success"],
    ["pending_verification", "Pending verification", "warning"],
    ["suspended", "Suspended", "danger"],
    ["admin_review", "Needs decision", "danger"],
    ["in_review", "In review", "info"],
  ])("%s -> %s (%s)", (status, label, variant) => {
    expect(resolveStatus(status)).toEqual({ variant, label });
  });

  it("is case-insensitive and falls back to the raw text for unknown statuses", () => {
    expect(resolveStatus("ACTIVE").label).toBe("Active");
    expect(resolveStatus("brand_new")).toEqual({ variant: "info", label: "brand new" });
  });

  it("always renders text with an icon, never colour only", () => {
    const { container } = render(<StatusPill status="suspended" />);
    expect(screen.getByText("Suspended")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
