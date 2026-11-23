import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { withNuqsTestingAdapter, type OnUrlUpdateFunction } from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";
import { axeViolations } from "@/test/axe";
import { DataTable, rowActionLabel, type DataTableColumn } from "./data-table";

type Row = { id: string; name: string };
const columns: DataTableColumn<Row>[] = [
  { accessorKey: "name", header: "Salon" },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <button aria-label={rowActionLabel("Verify", row.original.name)}>Verify</button>,
  },
];
const rows: Row[] = [{ id: "1", name: "RedBox Barber" }, { id: "2", name: "Glow Studio" }];

function renderTable(props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}, searchParams = "") {
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
  render(
    <DataTable<Row> label="Payout accounts" columns={columns} data={rows} getRowId={(r) => r.id} emptyMessage="No payout accounts" {...props} />,
    { wrapper: withNuqsTestingAdapter({ searchParams, onUrlUpdate }) },
  );
  return onUrlUpdate;
}

describe("DataTable", () => {
  it("renders rows with subject-specific action names", () => {
    renderTable();
    expect(screen.getByRole("table", { name: "Payout accounts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify for RedBox Barber" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify for Glow Studio" })).toBeInTheDocument();
  });

  it("shows the empty message, or No results with a clear link when filtered", () => {
    renderTable({ data: [] });
    expect(screen.getByText("No payout accounts")).toBeInTheDocument();
  });
  it("shows clear-filters when empty under filters", () => {
    renderTable({ data: [], clearFiltersHref: "/payout-accounts" });
    expect(screen.getByRole("link", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("hides paging when there is a single page", () => {
    renderTable({ nextCursor: null });
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  it("Next pushes the API cursor onto the URL stack; Previous is disabled on page 1", async () => {
    const onUrlUpdate = renderTable({ nextCursor: "c2" });
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onUrlUpdate).toHaveBeenCalled();
    expect(onUrlUpdate.mock.calls[0][0].searchParams.get("cursors")).toBe("c2");
  });

  it("Previous pops the stack", async () => {
    const onUrlUpdate = renderTable({ nextCursor: null }, "?cursors=c2,c3");
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onUrlUpdate.mock.calls[0][0].searchParams.get("cursors")).toBe("c2");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <DataTable<Row> label="Payout accounts" columns={columns} data={rows} emptyMessage="x" nextCursor="c2" />,
      { wrapper: withNuqsTestingAdapter() },
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
