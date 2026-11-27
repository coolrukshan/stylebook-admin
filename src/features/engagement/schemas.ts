import { z } from "zod";

const count = z.number().int().min(0);
const rate = z.number().min(0).max(1);

export const statsSchema = z.object({
  total_nudges_sent: count,
  total_nudges_opened: count,
  total_nudges_converted: count,
  overall_open_rate: rate,
  overall_conversion_rate: rate,
  holdout_group: z.object({
    size: count,
    organic_return_rate: rate,
    treatment_return_rate: rate,
    /** Relative: (nudged - holdout) / holdout. */
    lift: z.number(),
  }),
});
export type EngagementStats = z.infer<typeof statsSchema>;

export const HOLDOUT_MIN = 1;
export const HOLDOUT_MAX = 50;
export const HOLDOUT_DEFAULT = 10;

export const resetInputSchema = z.object({
  percentage: z.number().int().min(HOLDOUT_MIN).max(HOLDOUT_MAX),
  reason: z.string().trim().min(3).max(500),
});

export const resetResultSchema = z.object({
  previous_holdout_size: count,
  new_holdout_size: count,
  holdout_percentage: count,
});
export type ResetResult = z.infer<typeof resetResultSchema>;
