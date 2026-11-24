import { z } from "zod";

const text = z.string().nullish();
const cents = z.number().int().default(0);

export const payoutAccountSchema = z.object({
  id: z.string(),
  salon_id: z.string(),
  salon_name: text,
  bank_name: z.string(),
  branch: text,
  account_name: z.string(),
  account_last4: z.string(),
  verified: z.boolean().default(false),
  verified_at: text,
  rejected_at: text,
  created_at: text,
});
export type PayoutAccount = z.infer<typeof payoutAccountSchema>;

export const payoutAccountListSchema = z.object({
  items: z.array(payoutAccountSchema).default([]),
  next_cursor: z.string().nullish(),
});

export const payoutLineSchema = z.object({
  id: z.string(),
  salon_id: z.string(),
  salon_name: z.string(),
  gross_cents: cents,
  total_commission_cents: cents.optional(),
  commission_cents: cents.optional(),
  refund_deductions_cents: cents.optional(),
  dispute_deductions_cents: cents.optional(),
  net_cents: cents,
  reference: text,
  status: text,
});
export type PayoutLine = z.infer<typeof payoutLineSchema>;

export const payoutRunSchema = z.object({
  id: z.string(),
  status: z.string(),
  period_start: text,
  period_end: text,
  dry_run: z.boolean().default(false),
  total_cents: cents,
  commission_total_cents: cents,
  dispute_deductions_total_cents: cents,
  net_total_cents: cents,
  salon_count: z.number().int().default(0),
  created_at: z.string(),
  completed_at: text,
  lines: z.array(payoutLineSchema).default([]),
});
export type PayoutRun = z.infer<typeof payoutRunSchema>;

export const payoutRunListSchema = z.object({
  items: z.array(payoutRunSchema).default([]),
  next_cursor: z.string().nullish(),
});

export const REJECT_REASON_MIN = 3;
export const REJECT_REASON_MAX = 1000;

/** Fixed reason recorded in the audit log for every reveal (no dialog, per mockup). */
export const REVEAL_REASON = "Verify bank details";

export const idSchema = z.uuid();
export const rejectReasonSchema = z.string().trim().min(REJECT_REASON_MIN).max(REJECT_REASON_MAX);
