/**
 * Display-only money formatting. The API sends integer cents; the console never
 * computes fees, refunds or totals, it only formats what it is given.
 * Digits use en-US grouping (`8,165,568`) so output does not depend on the ICU
 * build's en-LK data.
 */
const INT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function assertCents(cents: number) {
  if (!Number.isSafeInteger(cents)) throw new RangeError("Money must be integer cents");
}

/** 150000 -> "LKR 1,500"; 150 -> "LKR 1.50"; -2500 -> "-LKR 25". */
export function formatLkr(cents: number): string {
  assertCents(cents);
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100); // integer math, no float drift
  const rem = abs % 100;
  const frac = rem === 0 ? "" : `.${String(rem).padStart(2, "0")}`;
  return `${sign}LKR ${INT.format(whole)}${frac}`;
}

function trim(n: number, digits: number) {
  return n.toFixed(digits).replace(/\.0+$/, "");
}

/** 890_000_000 -> "LKR 8.9M"; 71_400_000 -> "LKR 714k". Large KPIs only. */
export function formatLkrCompact(cents: number): string {
  assertCents(cents);
  const sign = cents < 0 ? "-" : "";
  const rupees = Math.round(Math.abs(cents) / 100);
  if (rupees < 1_000) return `${sign}LKR ${INT.format(rupees)}`;
  if (rupees < 1_000_000) {
    const k = rupees / 1_000;
    return `${sign}LKR ${trim(k, k < 10 ? 1 : 0)}k`;
  }
  if (rupees < 1_000_000_000) return `${sign}LKR ${trim(rupees / 1_000_000, 1)}M`;
  return `${sign}LKR ${trim(rupees / 1_000_000_000, 1)}B`;
}
