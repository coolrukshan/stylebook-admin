import { z } from "zod";

/**
 * `actor_email` and `meta` are deliberately not parsed (Zod strips them): they
 * can hold personal data and must not reach the browser.
 */
export const auditEntrySchema = z.object({
  id: z.string(),
  actor_id: z.string(),
  actor_role: z.string(),
  action: z.string(),
  target_type: z.string(),
  target_id: z.string(),
  reason: z.string().nullish(),
  ip_address: z.string().nullish(),
  created_at: z.string(),
});

export const auditListSchema = z.object({
  items: z.array(auditEntrySchema).default([]),
  next_cursor: z.string().nullish(),
});

export type AuditEntry = z.infer<typeof auditEntrySchema>;
