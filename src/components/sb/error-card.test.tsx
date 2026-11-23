import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axeViolations } from "@/test/axe";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const { ErrorCard } = await import("./error-card");
const { EmptyState } = await import("./empty-state");

describe("ErrorCard", () => {
  it("shows the request id and retries via router.refresh by default", async () => {
    render(<ErrorCard requestId="req-42" />);
    expect(screen.getByRole("alert")).toHaveTextContent("req-42");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refresh).toHaveBeenCalledOnce();
  });
  it("uses a custom retry (error boundary reset)", async () => {
    const reset = vi.fn();
    render(<ErrorCard onRetry={reset} />);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(reset).toHaveBeenCalledOnce();
  });
  it("has no axe violations", async () => {
    const { container } = render(<ErrorCard requestId="r" />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("EmptyState", () => {
  it("shows the friendly message", () => {
    render(<EmptyState message="No applications to review" />);
    expect(screen.getByText("No applications to review")).toBeInTheDocument();
  });
  it("shows No results and a clear-filters link when filtered", () => {
    render(<EmptyState message="ignored" clearHref="/users" />);
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/users");
  });
});
