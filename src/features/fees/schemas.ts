import { z } from "zod";

const percent = z.number().int();

export const feeSettingsSchema = z.object({
  service_commission_percent: percent,
  product_commission_percent: percent,
  deposit_default_percent: percent,
  max_no_show_fee_percent: percent,
  ai_credit_price_cents: z.number().int(),
  updated_at: z.string().nullish(),
});
export type FeeSettings = z.infer<typeof feeSettingsSchema>;

export const feeOverrideSchema = z.object({
  id: z.string(),
  salon_id: z.string(),
  salon_name: z.string(),
  service_commission_percent: percent.nullish(),
  product_commission_percent: percent.nullish(),
});
export type FeeOverride = z.infer<typeof feeOverrideSchema>;
export const feeOverrideListSchema = z.object({ items: z.array(feeOverrideSchema).default([]) });

const commission = z.number().int().min(0).max(50);

/** Only changed fields are sent; unknown keys are rejected so nothing else can be written. */
export const feeUpdateSchema = z
  .strictObject({
    service_commission_percent: commission.optional(),
    product_commission_percent: commission.optional(),
    deposit_default_percent: z.number().int().min(0).max(100).optional(),
    max_no_show_fee_percent: z.number().int().min(0).max(100).optional(),
    ai_credit_price_cents: z.number().int().min(0).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to save");
export type FeeUpdate = z.infer<typeof feeUpdateSchema>;

/** Both rates are always sent: the API deletes a rate that arrives as null. */
export const overrideInputSchema = z
  .object({ salonId: z.uuid(), service: commission.nullable(), product: commission.nullable() })
  .refine((v) => v.service !== null || v.product !== null, "Enter at least one rate");
export type OverrideInput = z.infer<typeof overrideInputSchema>;

export const idSchema = z.uuid();
export const salonQuerySchema = z.string().trim().min(2).max(100);
