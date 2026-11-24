/** After deciding `decidedId`, pick the next row: the following one, else the previous, else null. */
export function nextSelection(ids: readonly string[], decidedId: string): string | null {
  const i = ids.indexOf(decidedId);
  if (i === -1) return ids[0] ?? null;
  return ids[i + 1] ?? ids[i - 1] ?? null;
}

/** Oldest submission first (display order only; the API has no sort). */
export function sortOldestFirst<T extends { submitted_at: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => Date.parse(a.submitted_at) - Date.parse(b.submitted_at));
}
