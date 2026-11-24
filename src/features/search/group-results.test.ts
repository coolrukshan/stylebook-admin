import { describe, expect, it } from "vitest";
import { groupResults, hrefFor, type SearchResult } from "./group-results";

const r = (type: SearchResult["type"], n: number): SearchResult => ({
  type, id: `${type}-${n}`, title: `${type} ${n}`, subtitle: "", status: null, createdAt: "2026-01-01T00:00:00Z", href: hrefFor(type, `${type}-${n}`),
});

describe("groupResults", () => {
  it("orders groups fixed and caps 5 per type", () => {
    const input = [...Array.from({ length: 8 }, (_, i) => r("salons", i)), r("users", 1), r("disputes", 1)];
    const g = groupResults(input);
    expect(g.map((x) => x.type)).toEqual(["users", "salons", "disputes"]);
    expect(g[1].items).toHaveLength(5);
  });
  it("caps 15 in total", () => {
    const input = (["users", "salons", "bookings", "orders"] as const).flatMap((t) => Array.from({ length: 5 }, (_, i) => r(t, i)));
    const total = groupResults(input).reduce((n, g) => n + g.items.length, 0);
    expect(total).toBe(15);
  });
  it("returns nothing for no results", () => expect(groupResults([])).toEqual([]));
});

describe("hrefFor", () => {
  it("maps navigable types and encodes ids", () => {
    expect(hrefFor("users", "a/b")).toBe("/users/a%2Fb");
    expect(hrefFor("salons", "1")).toBe("/salons/1");
    expect(hrefFor("disputes", "DSP-1")).toBe("/disputes/DSP-1");
  });
  it("has no destination for bookings and orders", () => {
    expect(hrefFor("bookings", "1")).toBeNull();
    expect(hrefFor("orders", "1")).toBeNull();
  });
});
