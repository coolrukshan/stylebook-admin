import { z } from "zod";
import { DECISION_ACTIONS } from "./status";

const optionalText = z.string().nullish();

/** Fields the console uses; unknown API fields are stripped (never rendered). */
export const applicationItemSchema = z.object({
  id: z.string(),
  salon_name: z.string(),
  city: optionalText,
  status: z.string(),
  submitted_at: z.string(),
});
export type ApplicationItem = z.infer<typeof applicationItemSchema>;

export const applicationListSchema = z.object({
  items: z.array(applicationItemSchema).default([]),
  next_cursor: z.string().nullish(),
});

export const applicationDetailSchema = applicationItemSchema.extend({
  owner_name: z.string(),
  address: optionalText,
  business_registration: optionalText,
  staff_count: z.number().nullish(),
  services_description: optionalText,
  reason: optionalText,
  decided_by_name: optionalText,
  decided_at: optionalText,
  documents: z
    .array(z.object({ type: z.string(), url: z.string(), uploaded_at: z.string() }))
    .default([]),
  history: z
    .array(
      z.object({
        action: z.string(),
        actor_name: z.string(),
        reason: optionalText,
        timestamp: z.string(),
      }),
    )
    .default([]),
});
export type ApplicationDetail = z.infer<typeof applicationDetailSchema>;

export const REASON_MIN = 3;
export const REASON_MAX = 1000;

export const decisionInputSchema = z.object({
  id: z.uuid(),
  action: z.enum(DECISION_ACTIONS),
  reason: z.string().trim().min(REASON_MIN).max(REASON_MAX).optional(),
});
