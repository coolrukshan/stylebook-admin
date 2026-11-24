import { describe, expect, it } from "vitest";
import { nextSelection, sortOldestFirst } from "./next-selection";

describe("nextSelection", () => {
  const ids = ["a", "b", "c"];
  it("picks the following row", () => expect(nextSelection(ids, "a")).toBe("b"));
  it("falls back to the previous row at the end", () => expect(nextSelection(ids, "c")).toBe("b"));
  it("returns null when the queue empties", () => expect(nextSelection(["a"], "a")).toBeNull());
  it("selects the first row when the id is unknown", () => expect(nextSelection(ids, "z")).toBe("a"));
});

describe("sortOldestFirst", () => {
  it("orders by submission and does not mutate", () => {
    const input = [{ submitted_at: "2026-10-24T00:00:00Z" }, { submitted_at: "2026-10-23T00:00:00Z" }];
    expect(sortOldestFirst(input)[0]).toBe(input[1]);
    expect(input[0].submitted_at).toBe("2026-10-24T00:00:00Z");
  });
});
