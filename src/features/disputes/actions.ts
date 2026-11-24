"use server";

import { revalidatePath } from "next/cache";
import { runAdminAction } from "@/lib/actions/run-admin-action";
import { ApiError, failure, unwrap, type ActionResult } from "@/lib/api/errors";
import { decisionSchema, idSchema, reasonSchema } from "./schemas";

const invalid = () => failure(new ApiError({ status: 422, code: "VALIDATION_ERROR" }));

/**
 * The console sends only the decision and reason, never an amount.
 * full_refund -> API `refund` (assumes the API refunds the dispute amount; UNVERIFIED).
 */
export async function decideDispute(
  id: string,
  decision: string,
  reason: string,
  idempotencyKey?: string,
): Promise<ActionResult<{ status: string }>> {
  const d = decisionSchema.safeParse(decision);
  const r = reasonSchema.safeParse(reason);
  if (!idSchema.safeParse(id).success || !d.success || !r.success) return invalid();
  const result = await runAdminAction({
    permission: "dispute.decide",
    idempotencyKey,
    name: d.data === "full_refund" ? "dispute.refunded" : "dispute.rejected",
    call: async (api) => {
      const out = await unwrap(
        api.POST("/v1/admin/disputes/{dispute_id}/decide", {
          params: { path: { dispute_id: id } },
          body: { decision: d.data === "full_refund" ? "refund" : "reject", reason: r.data },
        }),
      );
      return { status: out.status };
    },
  });
  if (result.ok) revalidatePath("/disputes", "layout");
  return result;
}

/** Used after a timeout to learn whether the decision landed. Returns only the status. */
export async function getDisputeStatus(id: string): Promise<ActionResult<{ status: string }>> {
  if (!idSchema.safeParse(id).success) return invalid();
  return runAdminAction({
    permission: "dispute.decide",
    name: "dispute.status_check",
    call: async (api) => {
      const out = await unwrap(api.GET("/v1/disputes/{dispute_id}", { params: { path: { dispute_id: id } } }));
      return { status: out.status };
    },
  });
}
