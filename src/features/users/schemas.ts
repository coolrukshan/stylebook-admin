import { z } from "zod";

const text = z.string().nullish();

/** Raw API shapes. Contact fields are unmasked here and must be mapped before leaving the server. */
export const userListItemSchema = z.object({
  id: z.string(),
  full_name: text,
  email: text,
  phone: text,
  role: z.string(),
  is_active: z.boolean(),
  suspended_at: text,
  booking_count: z.number().int().default(0),
  created_at: z.string(),
});
export type UserListItem = z.infer<typeof userListItemSchema>;

export const userListSchema = z.object({
  items: z.array(userListItemSchema).default([]),
  next_cursor: z.string().nullish(),
});

export const userDetailSchema = userListItemSchema.extend({
  suspend_reason: text,
  order_count: z.number().int().default(0),
  total_spend_cents: z.number().int().default(0),
  dispute_count: z.number().int().default(0),
  review_count: z.number().int().default(0),
  favourite_salons: z.number().int().default(0),
  last_booking_at: text,
  salons_owned: z.array(z.object({ id: z.string(), name: z.string(), is_active: z.boolean() })).default([]),
  recent_bookings: z
    .array(z.object({ id: z.string(), reference_code: text, salon_name: z.string(), status: z.string(), date: z.string() }))
    .default([]),
  recent_orders: z
    .array(
      z.object({
        id: z.string(),
        reference_code: text,
        salon_name: z.string(),
        status: z.string(),
        total_cents: z.number().int(),
        date: z.string(),
      }),
    )
    .default([]),
});
export type UserDetailRaw = z.infer<typeof userDetailSchema>;

export const REASON_MIN = 5;
export const REASON_MAX = 1000;
export const idSchema = z.uuid();
export const reasonSchema = z.string().trim().min(REASON_MIN).max(REASON_MAX);
