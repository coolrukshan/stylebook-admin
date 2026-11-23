/** Shown as supplied: whole numbers stay whole, decimals the API sends are kept. "0.6%", "4%". */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) throw new RangeError("Percent must be finite");
  return `${value}%`;
}
