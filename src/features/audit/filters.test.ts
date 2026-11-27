import { describe, expect, it } from "vitest";
import { isInvalidRange, parseFilters, toApiQuery, toSearchParams } from "./filters";

const NOW = new Date("2026-11-27T20:00:00Z");
const ID = "3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b";

describe("audit filters", () => {
  it("defaults to the last 30 UTC days", () => {
    expect(parseFilters({}, NOW)).toEqual({ from: "2026-10-29", to: "2026-11-27", area: undefined, role: undefined, actor: undefined });
  });

  it("ignores invalid values", () => {
    const f = parseFilters({ from: "yesterday", to: "2026-02-30", area: "x.", role: "root", actor: "1", targetType: "user" }, NOW);
    expect(toSearchParams(f)).toBe("from=2026-10-29&to=2026-11-27");
  });

  it("maps valid values to the API query", () => {
    const f = parseFilters(
      { from: "2026-11-01", to: "2026-11-02", area: "user.", role: "support", actor: ID, targetType: "user", targetId: ID },
      NOW,
    );
    expect(toApiQuery(f)).toEqual({
      from_date: "2026-11-01",
      to_date: "2026-11-02",
      action: "user.",
      actor_role: "support",
      actor_id: ID,
      target_type: "user",
      target_id: ID,
    });
  });

  it("flags a reversed range", () => {
    expect(isInvalidRange(parseFilters({ from: "2026-11-03", to: "2026-11-02" }, NOW))).toBe(true);
    expect(isInvalidRange(parseFilters({ from: "2026-11-02", to: "2026-11-02" }, NOW))).toBe(false);
  });
});
