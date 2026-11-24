"use server";

import { revalidatePath } from "next/cache";
import { runAdminAction } from "@/lib/actions/run-admin-action";
import { ApiError, failure, unwrap, type ActionResult } from "@/lib/api/errors";
import { idSchema, reasonSchema } from "./schemas";

const invalid = () => failure(new ApiError({ status: 422, code: "VALIDATION_ERROR" }));

async function change(
  kind: "suspend" | "reactivate",
  id: string,
  reason: string,
  idempotencyKey?: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = reasonSchema.safeParse(reason);
  if (!idSchema.safeParse(id).success || !parsed.success) return invalid();
  const result = await runAdminAction({
    permission: "user.suspend",
    idempotencyKey,
    name: kind === "suspend" ? "user.suspended" : "user.reactivated",
    call: async (api) => {
      if (kind === "suspend") {
        await unwrap(
          api.POST("/v1/admin/users/{user_id}/suspend", {
            params: { path: { user_id: id } },
            body: { reason: parsed.data },
          }),
        );
      } else {
        await unwrap(
          api.POST("/v1/admin/users/{user_id}/reactivate", {
            params: { path: { user_id: id } },
            body: { note: parsed.data },
          }),
        );
      }
      return { id };
    },
  });
  if (result.ok) revalidatePath("/users", "layout");
  return result;
}

export async function suspendUser(id: string, reason: string, key?: string) {
  return change("suspend", id, reason, key);
}
export async function reactivateUser(id: string, reason: string, key?: string) {
  return change("reactivate", id, reason, key);
}
