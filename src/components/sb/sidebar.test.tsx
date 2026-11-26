import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axeViolations } from "@/test/axe";

const pathname = "/applications";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock("@/lib/api/nav-counts", () => ({ getNavCounts: vi.fn() }));

const { SidebarNav, visibleNavItems } = await import("./sidebar");

describe("visibleNavItems", () => {
  it("super admin sees everything in mockup order, extras after Re-engagement", () => {
    const labels = visibleNavItems({ role: "super_admin", permissions: [] }).map((i) => i.label);
    expect(labels.slice(0, 7)).toEqual([
      "Dashboard", "Salon applications", "Payout accounts", "Users",
      "Disputes and refunds", "Fees and commission", "Re-engagement",
    ]);
    expect(labels.slice(-2)).toEqual(["Admin roles", "Audit log"]);
    expect(labels).toContain("Moderation");
  });
  it("hides items the role lacks permission for", () => {
    const labels = visibleNavItems({ role: "moderator", permissions: ["moderation.decide", "audit.read"] }).map((i) => i.label);
    expect(labels).toEqual(["Moderation", "Audit log"]);
  });
  it("shows nothing for an admin with no permissions", () => {
    expect(visibleNavItems({ role: "support", permissions: [] })).toEqual([]);
  });
});

describe("SidebarNav", () => {
  const items = visibleNavItems({ role: "super_admin", permissions: [] });

  it("marks the active item with aria-current", () => {
    render(<SidebarNav items={items} />);
    expect(screen.getByRole("link", { name: /Salon applications/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Users" })).not.toHaveAttribute("aria-current");
  });

  it("shows badges, caps at limit, and omits zero or missing counts", () => {
    render(
      <SidebarNav
        items={items}
        counts={{ applications: { count: 3, capped: false }, payoutAccounts: { count: 50, capped: true }, disputes: { count: 0, capped: false } }}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByLabelText(/^3 pending in Salon applications/)).toHaveTextContent("3");
    expect(within(nav).getByLabelText(/^50\+ pending in Payout accounts/)).toHaveTextContent("50+");
    expect(within(nav).queryByLabelText(/Disputes and refunds/)).toBeNull();
  });

  it("renders no badges when counts failed to load", () => {
    render(<SidebarNav items={items} counts={{}} />);
    expect(screen.queryByLabelText(/pending in/)).toBeNull();
  });

  it("has no axe violations", async () => {
    const { container } = render(<SidebarNav items={items} counts={{ applications: { count: 3, capped: false } }} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
