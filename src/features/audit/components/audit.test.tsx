import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axeViolations } from "@/test/axe";
import type { AuditRow } from "../rows";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push }) }));
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (m: string) => toastError(m), success: vi.fn() } }));
vi.mock("next/form", () => ({
  default: ({ action, ...props }: React.ComponentProps<"form"> & { action: string }) => <form action={action} {...props} />,
}));
const { AuditTable } = await import("./audit-table");
const { AuditFilterBar } = await import("./audit-filters");
const { ExportButton } = await import("./export-button");

const row: AuditRow = {
  id: "r1",
  at: "2026-10-25T03:42:00Z",
  who: "Dinusha (Support)",
  action: "Suspended user",
  subjectLabel: "user bbbbbbbb",
  subjectHref: "/users/bbbbbbbb",
  historyHref: "/audit?targetType=user",
  reason: "Spam reviews",
  ip: "10.4.2.17",
};
const table = (rows: AuditRow[]) =>
  render(
    <NuqsTestingAdapter>
      <AuditTable rows={rows} nextCursor={null} />
    </NuqsTestingAdapter>,
  );

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("AuditTable", () => {
  it("shows Colombo time, actor, sentence, reason and IP, with no row actions", async () => {
    const { container } = table([row]);
    expect(screen.getByText("25 Oct 2026, 09:12")).toBeInTheDocument();
    expect(screen.getByText("Sun 25 Oct 2026, 09:12:00 UTC+05:30")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Dinusha/ })).toHaveTextContent("Suspended user · user bbbbbbbb (reason: Spam reviews)");
    expect(screen.getByRole("link", { name: "user bbbbbbbb" })).toHaveAttribute("href", "/users/bbbbbbbb");
    expect(screen.getByText("10.4.2.17")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("shows the empty message", () => {
    table([]);
    expect(screen.getByRole("status")).toHaveTextContent("No audit entries match these filters");
  });
});

describe("AuditFilterBar", () => {
  const filters = { from: "2026-11-01", to: "2026-11-02" };

  it("labels UTC dates and hides the admin filter without names", async () => {
    const { container } = render(<AuditFilterBar filters={filters} admins={[]} />);
    expect(screen.getByLabelText("From (UTC date)")).toHaveValue("2026-11-01");
    expect(screen.queryByLabelText("Admin")).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("keeps a subject filter and offers to remove it", () => {
    render(<AuditFilterBar filters={{ ...filters, targetType: "user", targetId: "bbbbbbbb-1" }} admins={[["a", "Kamal"]]} />);
    expect(screen.getByLabelText("Admin")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Remove" })).toHaveAttribute("href", "/audit?from=2026-11-01&to=2026-11-02");
  });
});

describe("ExportButton", () => {
  it("shows the server's message when the export is refused", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "Too many rows" }, { status: 422 })));
    render(<ExportButton query="from=2026-11-01" />);
    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(fetch).toHaveBeenCalledWith("/api/export/audit?from=2026-11-01", { cache: "no-store" });
    expect(toastError).toHaveBeenCalledWith("Too many rows");
  });

  it("sends an expired session to sign-in", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    render(<ExportButton query="" />);
    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(push).toHaveBeenCalledWith("/login");
  });
});
