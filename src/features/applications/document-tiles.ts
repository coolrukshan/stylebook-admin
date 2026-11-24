export type TileKey = "business_registration" | "owner_nic" | "proof_of_address" | "photos";
export type TileState = "received" | "missing";

export type Tile = {
  key: TileKey;
  label: string;
  state: TileState;
  /** Photos only. */
  count?: number;
  /** Index into `documents` of the first matching document (viewer target). */
  index?: number;
};

type Doc = { type: string };

/**
 * UNVERIFIED: real `type` strings are not known. Matching is by substring so
 * `nic`, `owner_nic`, `proof_of_address`, `photo`, `salon_photo` all work.
 */
export function classifyDocument(type: string): TileKey | null {
  const t = type.toLowerCase();
  if (t.includes("nic") || t.includes("national")) return "owner_nic";
  if (t.includes("address")) return "proof_of_address";
  if (t.includes("photo") || t.includes("image")) return "photos";
  if (t.includes("registration") || t.includes("business")) return "business_registration";
  return null;
}

const LABELS: Record<TileKey, string> = {
  business_registration: "Business registration",
  owner_nic: "Owner NIC",
  proof_of_address: "Proof of address",
  photos: "Salon photos",
};
const ORDER: TileKey[] = ["business_registration", "owner_nic", "proof_of_address", "photos"];

/** The four tiles in spec order. Received/Missing is presence only. */
export function buildTiles(documents: readonly Doc[]): { tiles: Tile[]; other: number[] } {
  const found = new Map<TileKey, number[]>();
  const other: number[] = [];
  documents.forEach((d, i) => {
    const key = classifyDocument(d.type);
    if (!key) return void other.push(i);
    found.set(key, [...(found.get(key) ?? []), i]);
  });
  const tiles = ORDER.map<Tile>((key) => {
    const idx = found.get(key) ?? [];
    return {
      key,
      label: key === "photos" ? `${LABELS[key]} (${idx.length})` : LABELS[key],
      state: idx.length ? "received" : "missing",
      count: key === "photos" ? idx.length : undefined,
      index: idx[0],
    };
  });
  return { tiles, other };
}

/** Indexes of all photo documents, in order (gallery). */
export function photoIndexes(documents: readonly Doc[]): number[] {
  return documents.flatMap((d, i) => (classifyDocument(d.type) === "photos" ? [i] : []));
}
