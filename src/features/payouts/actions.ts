"use server";

import { revalidatePath } from "next/cache";
import { runAdminAction } from "@/lib/actions/run-admin-action";
import { ApiError, failure, unwrap, type ActionResult } from "@/lib/api/errors";
import { idSchema, rejectReasonSchema, REVEAL_REASON } from "./schemas";

const invalid = () => failure(new ApiError({ status: 422, code: "VALIDATION_ERROR" }));

/** Audited by the API. Returns only the number, to the one client component that asked. */
export async function revealPayoutAccount(id: string): Promise<ActionResult<string>> {
  if (!idSchema.safeParse(id).success) return invalid();
  return runAdminAction({
    permission: "bank_account.reveal",
    name: "bank_account.revealed",
    call: async (api) => {
      const out = await unwrap(
        api.POST("/v1/admin/payout-accounts/{account_id}/reveal", {
          params: { path: { account_id: id } },
          body: { reason: REVEAL_REASON },
        }),
      );
      return out.account_number;
    },
  });
}

export async function verifyPayoutAccount(id: string, idempotencyKey?: string): Promise<ActionResult<{ id: string }>> {
  if (!idSchema.safeParse(id).success) return invalid();
  const result = await runAdminAction({
    permission: "payout_account.verify",
    idempotencyKey,
    name: "payout_account.verified",
    call: async (api) => {
      await unwrap(
        api.POST("/v1/admin/payout-accounts/{account_id}/verify", {
          params: { path: { account_id: id } },
          body: {},
        }),
      );
      return { id };
    },
  });
  if (result.ok) revalidatePath("/payouts", "layout");
  return result;
}

export async function rejectPayoutAccount(
  id: string,
  reason: string,
  idempotencyKey?: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = rejectReasonSchema.safeParse(reason);
  if (!idSchema.safeParse(id).success || !parsed.success) return invalid();
  const result = await runAdminAction({
    permission: "payout_account.verify",
    idempotencyKey,
    name: "payout_account.rejected",
    call: async (api) => {
      await unwrap(
        api.POST("/v1/admin/payout-accounts/{account_id}/reject", {
          params: { path: { account_id: id } },
          body: { reason: parsed.data },
        }),
      );
      return { id };
    },
  });
  if (result.ok) revalidatePath("/payouts", "layout");
  return result;
}
