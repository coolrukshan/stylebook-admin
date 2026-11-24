import { z } from "zod";

const text = z.string().nullish();

export const disputeSchema = z.object({
  id: z.string(),
  booking_id: text,
  order_id: text,
  user_id: z.string(),
  salon_id: z.string(),
  status: z.string(),
  category: z.string().default("other"),
  reason: z.string(),
  evidence_urls: z.array(z.string()).default([]),
  salon_response: text,
  salon_responded_at: text,
  offer_refund: z.boolean().default(false),
  offered_refund_cents: z.number().int().default(0),
  admin_decision: text,
  admin_reason: text,
  salon_deadline: text,
  created_at: z.string(),
  resolved_at: text,
});
export type Dispute = z.infer<typeof disputeSchema>;

export const disputeListSchema = z.object({
  items: z.array(disputeSchema).default([]),
  next_cursor: z.string().nullish(),
});

/** `partial` (50%) is deliberately absent: it needs an amount the console cannot know. */
export const DECISIONS = ["full_refund", "reject"] as const;
export type Decision = (typeof DECISIONS)[number];

export const REASON_MIN = 3;
export const REASON_MAX = 1000;
export const idSchema = z.uuid();
export const reasonSchema = z.string().trim().min(REASON_MIN).max(REASON_MAX);
export const decisionSchema = z.enum(DECISIONS);
