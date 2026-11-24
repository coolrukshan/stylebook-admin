"use server";

import { revalidatePath } from "next/cache";
import { runAdminAction } from "@/lib/actions/run-admin-action";
import { failure, unwrap, type ActionResult } from "@/lib/api/errors";
import { ApiError } from "@/lib/api/errors";
import { decisionInputSchema } from "./schemas";
import type { DecisionAction } from "./status";

const PERMISSION = "salon_application.approve" as const;
const NAMES: Record<DecisionAction, string> = {
  approve: "salon_application.approved",
  request_info: "salon_application.info_requested",
  reject: "salon_application.rejected",
};

async function decide(
  id: string,
  action: DecisionAction,
  reason: string | undefined,
  idempotencyKey?: string,
): Promise<ActionResult<{ status: string }>> {
  const parsed = decisionInputSchema.safeParse({ id, action, reason });
  // Request info and reject must carry a reason (spec A-04.3/A-04.4).
  if (!parsed.success || (action !== "approve" && !parsed.data.reason)) {
    return failure(new ApiError({ status: 422, code: "VALIDATION_ERROR" }));
  }
  const result = await runAdminAction({
    permission: PERMISSION,
    idempotencyKey,
    name: NAMES[action],
    call: async (api) => {
      const out = await unwrap(
        api.POST("/v1/admin/applications/{application_id}/{action}", {
          params: { path: { application_id: parsed.data.id, action: parsed.data.action } },
          body: parsed.data.reason ? { reason: parsed.data.reason } : null,
        }),
      );
      return { status: out.status };
    },
  });
  if (result.ok) revalidatePath("/applications", "layout");
  return result;
}

export async function approveApplication(id: string, idempotencyKey?: string) {
  return decide(id, "approve", undefined, idempotencyKey);
}
export async function requestApplicationInfo(id: string, reason: string, idempotencyKey?: string) {
  return decide(id, "request_info", reason, idempotencyKey);
}
export async function rejectApplication(id: string, reason: string, idempotencyKey?: string) {
  return decide(id, "reject", reason, idempotencyKey);
}
