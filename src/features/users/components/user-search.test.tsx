import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from "nuqs/adapters/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SEARCH_DEBOUNCE_MS, UserSearch } from "./user-search";

function setup(onUrlUpdate: OnUrlUpdateFunction, search = "") {
  return render(
    <NuqsTestingAdapter searchParams={search} onUrlUpdate={onUrlUpdate}>
      <UserSearch shown={8} hasMore />
    </NuqsTestingAdapter>,
  );
}
afterEach(() => vi.useRealTimers());

describe("UserSearch", () => {
  it("updates ?q after the debounce and resets paging", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onUrlUpdate = vi.fn();
    setup(onUrlUpdate, "?cursors=a,b");
    await userEvent.type(screen.getByRole("searchbox", { name: "Find user" }), "077");
    expect(onUrlUpdate).not.toHaveBeenCalled();
    await act(async () => void vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS + 10));
    const last = onUrlUpdate.mock.calls.at(-1)?.[0].searchParams as URLSearchParams;
    expect(last.get("q")).toBe("077");
    expect(last.has("cursors")).toBe(false);
  });

  it("commits immediately on Enter", async () => {
    const onUrlUpdate = vi.fn();
    setup(onUrlUpdate);
    await userEvent.type(screen.getByRole("searchbox", { name: "Find user" }), "nimal{Enter}");
    expect((onUrlUpdate.mock.calls.at(-1)?.[0].searchParams as URLSearchParams).get("q")).toBe("nimal");
  });

  it("shows the count with + when more pages exist", () => {
    setup(vi.fn());
    expect(screen.getByRole("status")).toHaveTextContent("8+ shown");
  });
});
