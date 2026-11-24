import { describe, expect, it } from "vitest";
import { buildTiles, classifyDocument, photoIndexes } from "./document-tiles";

describe("buildTiles", () => {
  it("marks every tile missing with no documents", () => {
    const { tiles } = buildTiles([]);
    expect(tiles.map((t) => t.state)).toEqual(["missing", "missing", "missing", "missing"]);
    expect(tiles[3].label).toBe("Salon photos (0)");
  });
  it("keeps spec order and counts photos", () => {
    const docs = [{ type: "photo" }, { type: "owner_nic" }, { type: "photo" }, { type: "business_registration" }];
    const { tiles } = buildTiles(docs);
    expect(tiles.map((t) => t.key)).toEqual(["business_registration", "owner_nic", "proof_of_address", "photos"]);
    expect(tiles.map((t) => t.state)).toEqual(["received", "received", "missing", "received"]);
    expect(tiles[3]).toMatchObject({ count: 2, label: "Salon photos (2)", index: 0 });
    expect(photoIndexes(docs)).toEqual([0, 2]);
  });
  it("collects unknown types instead of hiding them", () => {
    expect(buildTiles([{ type: "lease_agreement" }]).other).toEqual([0]);
    expect(classifyDocument("proof_of_address")).toBe("proof_of_address");
  });
});
