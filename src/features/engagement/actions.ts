"use server";

import { revalidatePath } from "next/cache";
import { runAdminAction } from "@/lib/actions/run-admin-action";
import { ApiError, failure, unwrap, type ActionResult } from "@/lib/api/errors";
import { resetInputSchema, resetResultSchema, type ResetResult } from "./schemas";

/** Destructive: the API deletes the holdout group and re-randomises it. */
export async function resetHoldout(
  percentage: number,
  reason: string,
  idempotencyKey?: string,
): Promise<ActionResult<ResetResult>> {
  const parsed = resetInputSchema.safeParse({ percentage, reason });
  if (!parsed.success) return failure(new ApiError({ status: 422, code: "VALIDATION_ERROR" }));
  const result = await runAdminAction({
    permission: "engagement.edit",
    idempotencyKey,
    name: "engagement.holdout_reset",
    call: async (api) =>
      resetResultSchema.parse(
        await unwrap(
          api.POST("/v1/admin/engagement/holdout/reset", {
            body: { holdout_percentage: parsed.data.percentage, reason: parsed.data.reason },
          }),
        ),
      ),
  });
  if (result.ok) revalidatePath("/engagement");
  return result;
}
