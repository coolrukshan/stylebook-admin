import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axeViolations } from "@/test/axe";
import { TASKS } from "../tasks";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
const { TasksPanel } = await import("./tasks-panel");

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchInterval: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("TasksPanel", () => {
  it("hides zero and missing rows, caps with +", () => {
    wrap(<TasksPanel tasks={TASKS} initial={{ applications: { count: 3, capped: false }, payoutAccounts: { count: 0, capped: false }, disputes: { count: 50, capped: true } }} />);
    expect(screen.getByText("Salon applications to review")).toBeInTheDocument();
    expect(screen.getByText("50+")).toBeInTheDocument();
    expect(screen.queryByText("Payout accounts to verify")).toBeNull();
    expect(screen.queryByText(/moderation/)).toBeNull();
  });
  it("shows the all-clear message when nothing is pending", () => {
    wrap(<TasksPanel tasks={TASKS} initial={{}} />);
    expect(screen.getByText("Nothing needs your attention")).toBeInTheDocument();
  });
  it("has no axe violations", async () => {
    const { container } = wrap(<TasksPanel tasks={TASKS} initial={{ applications: { count: 3, capped: false } }} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
