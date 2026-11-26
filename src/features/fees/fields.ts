import { formatLkr } from "@/lib/format/money";
import { formatPercent } from "@/lib/format/percent";

export type FeeKey =
  | "service_commission_percent"
  | "product_commission_percent"
  | "deposit_default_percent"
  | "max_no_show_fee_percent"
  | "ai_credit_price_cents";

export type FeeValues = Record<FeeKey, number>;

export type FeeField = {
  key: FeeKey;
  label: string;
  helper: string;
  unit: "percent" | "money";
  /** In stored units (percentage points, or cents). */
  step: number;
  min: number;
  max: number | null;
};

/** Bounds mirror the API's FeeSettingsUpdateRequest; the API still validates. */
export const FEE_FIELDS: readonly FeeField[] = [
  { key: "service_commission_percent", label: "Commission on services", helper: "Per completed booking", unit: "percent", step: 1, min: 0, max: 50 },
  { key: "product_commission_percent", label: "Commission on products", helper: "Per marketplace order", unit: "percent", step: 1, min: 0, max: 50 },
  { key: "deposit_default_percent", label: "Default deposit for new clients", helper: "Salons can change it", unit: "percent", step: 1, min: 0, max: 100 },
  { key: "max_no_show_fee_percent", label: "Max no-show fee salons can set", helper: "Share of the booking price", unit: "percent", step: 1, min: 0, max: 100 },
  { key: "ai_credit_price_cents", label: "AI credit price", helper: "Price per AI credit", unit: "money", step: 100, min: 0, max: null },
];

export const FEE_KEYS = FEE_FIELDS.map((f) => f.key);

export const formatFee = (field: FeeField, value: number) =>
  field.unit === "percent" ? formatPercent(value) : formatLkr(value);

export function clamp(field: FeeField, value: number): number {
  return Math.max(field.min, field.max === null ? value : Math.min(field.max, value));
}

/** "12.50" -> 1250 cents, using string parsing so there is no float drift. */
export function parseRupees(text: string): number | null {
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

/** Stored value -> what the input shows. */
export function toText(field: FeeField, value: number): string {
  if (field.unit === "percent") return String(value);
  const rem = value % 100;
  return `${Math.floor(value / 100)}${rem ? `.${String(rem).padStart(2, "0")}` : ""}`;
}

/** Input text -> stored value, or null when malformed or out of range. */
export function parseField(field: FeeField, text: string): number | null {
  const value = field.unit === "money" ? parseRupees(text) : /^\d{1,3}$/.test(text.trim()) ? Number(text) : null;
  if (value === null || value < field.min || (field.max !== null && value > field.max)) return null;
  return value;
}

export type FeeChange = { field: FeeField; from: number; to: number };

export function diffFees(saved: FeeValues, draft: Partial<Record<FeeKey, number | null>>): FeeChange[] {
  return FEE_FIELDS.flatMap((field) => {
    const to = draft[field.key];
    return typeof to === "number" && to !== saved[field.key] ? [{ field, from: saved[field.key], to }] : [];
  });
}
