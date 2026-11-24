import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const { GlobalSearch } = await import("./global-search");

const result = (type: string, id: string, title: string) => ({ type, id, title, subtitle: "sub", status: null, createdAt: "2026-01-01T00:00:00Z", href: type === "users" ? `/users/${id}` : null });

let fetchMock: ReturnType<typeof vi.fn>;
beforeAll(() => {
  // cmdk needs these in jsdom.
  global.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView ??= () => {};
});
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  push.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><GlobalSearch /></QueryClientProvider>);
}
const json = (results: unknown[]) => Promise.resolve(new Response(JSON.stringify({ results }), { status: 200 }));

describe("GlobalSearch", () => {
  it("opens with Ctrl+K and with / outside inputs, and shows the idle hint", async () => {
    setup();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(await screen.findByText(/Type at least 2 characters/)).toBeInTheDocument();
  });

  it("opens with /", async () => {
    setup();
    fireEvent.keyDown(document.body, { key: "/" });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("debounces: no call under 2 chars, one call after typing", async () => {
    fetchMock.mockImplementation(() => json([]));
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Search users/ }));
    const input = await screen.findByRole("combobox");
    await userEvent.type(input, "a");
    await act(() => new Promise((r) => setTimeout(r, 350)));
    expect(fetchMock).not.toHaveBeenCalled();
    await userEvent.type(input, "lice");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/search?q=alice");
  });

  it("groups results, navigates for users, opens a read-only dialog for bookings", async () => {
    fetchMock.mockImplementation(() => json([result("bookings", "b1", "BK-1"), result("users", "u1", "Alice")]));
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Search users/ }));
    await userEvent.type(await screen.findByRole("combobox"), "al");
    const alice = await screen.findByText("Alice");
    expect(screen.getByText("Users")).toBeInTheDocument();
    await userEvent.click(alice);
    expect(push).toHaveBeenCalledWith("/users/u1");
  });

  it("booking selection opens the summary dialog without navigating", async () => {
    fetchMock.mockImplementation(() => json([result("bookings", "b1", "BK-1")]));
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Search users/ }));
    await userEvent.type(await screen.findByRole("combobox"), "bk");
    await userEvent.click(await screen.findByText("BK-1"));
    expect(await screen.findByText(/read-only summary/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows the empty and error states", async () => {
    fetchMock.mockImplementationOnce(() => json([]));
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Search users/ }));
    const input = await screen.findByRole("combobox");
    await userEvent.type(input, "zz");
    expect(await screen.findByText(/No matches for "zz"/)).toBeInTheDocument();
    fetchMock.mockImplementationOnce(() => Promise.resolve(new Response("{}", { status: 502 })));
    await userEvent.type(input, "x");
    expect(await screen.findByText("Search is unavailable")).toBeInTheDocument();
  });
});
