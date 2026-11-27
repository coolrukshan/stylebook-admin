"use server";

import { revalidatePath } from "next/cache";
import { runAdminAction } from "@/lib/actions/run-admin-action";
import { ApiError, failure, unwrap, type ActionResult } from "@/lib/api/errors";
import { SUPER_ADMIN_ROLE } from "@/lib/auth/permissions";
import { applyChanges } from "./catalogue";
import { listAllAdmins } from "./list";
import { accessChangeSchema } from "./schemas";

/**
 * Changes one admin's permissions. The API replaces the whole array and takes no
 * reason, so the account is re-read first and only the requested changes are
 * applied. Never sends `role` (plan 08, S1).
 */
export async function updateAdminAccess(input: unknown, idempotencyKey?: string): Promise<ActionResult<{ id: string }>> {
  const parsed = accessChangeSchema.safeParse(input);
  if (!parsed.success) return failure(new ApiError({ status: 422, code: "VALIDATION_ERROR" }));
  const { adminId, grant, revoke } = parsed.data;
  const result = await runAdminAction({
    permission: "admin.manage",
    idempotencyKey,
    name: "admin_user.update",
    call: async (api) => {
      const { admins } = await listAllAdmins(api);
      const target = admins.find((a) => a.id === adminId);
      // Gone, or promoted to Super admin since the page loaded.
      if (!target || target.role === SUPER_ADMIN_ROLE) throw new ApiError({ status: 409, code: "CONFLICT" });
      const next = applyChanges(target.permissions, grant, revoke);
      const unchanged = next.length === target.permissions.length && next.every((p) => target.permissions.includes(p));
      if (!unchanged) {
        await unwrap(
          api.PUT("/v1/admin/roles/{admin_user_id}", {
            params: { path: { admin_user_id: adminId } },
            body: { permissions: next },
          }),
        );
      }
      return { id: adminId };
    },
  });
  if (result.ok) revalidatePath("/roles");
  return result;
}
