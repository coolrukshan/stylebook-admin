import { z } from "zod";
import { NOT_GRANTABLE, PERMISSION_NAMES } from "./catalogue";

/** Email is deliberately not parsed: the screen does not show it. */
export const adminSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  role: z.string(),
  permissions: z.array(z.string()).default([]),
  is_active: z.boolean(),
  totp_enabled: z.boolean(),
  last_login_at: z.string().nullish(),
});

export const adminListSchema = z.object({
  items: z.array(adminSchema).default([]),
  next_cursor: z.string().nullish(),
});

export type AdminRow = {
  id: string;
  name: string;
  role: string;
  permissions: string[];
  active: boolean;
  twoFactor: boolean;
  lastSignInAt: string | null;
};

export const toAdminRow = (a: z.infer<typeof adminSchema>): AdminRow => ({
  id: a.id,
  name: a.full_name,
  role: a.role,
  permissions: a.permissions,
  active: a.is_active,
  twoFactor: a.totp_enabled,
  lastSignInAt: a.last_login_at ?? null,
});

const names = z.array(z.enum(PERMISSION_NAMES));

export const accessChangeSchema = z
  .object({ adminId: z.uuid(), grant: names, revoke: names })
  .refine((c) => c.grant.length + c.revoke.length > 0, "Nothing to change")
  .refine((c) => !c.grant.some((n) => c.revoke.includes(n)), "A permission can't be granted and removed")
  .refine((c) => !c.grant.some((n) => NOT_GRANTABLE.has(n)), "This permission can't be granted here");
