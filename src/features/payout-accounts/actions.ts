"use server";

import { z } from "zod";
import { runAdminAction } from "@/lib/actions/run-admin-action";
import { unwrap, type ActionResult } from "@/lib/api/errors";

const input = z.object({
  accountId: z.uuid(),
  // API: min 3, max 1000; default "Verify bank details".
  reason: z.string().trim().min(3).max(1000).default("Verify bank details"),
  idempotencyKey: z.string().min(8).max(100).optional(),
});

/**
 * Contract for MaskedValue's `reveal`: returns the full account number to the
 * calling client component only. The reveal is an audited API call
 * (`bank_account.revealed`); nothing is cached (client uses cache: "no-store"),
 * the value is not logged, put in a URL, or revalidated into any page.
 */
export async function revealBankAccount(
  accountId: string,
  reason?: string,
  idempotencyKey?: string,
): Promise<ActionResult<string>> {
  const parsed = input.safeParse({ accountId, reason, idempotencyKey });
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Some details are not valid. Check the form and try again.",
        field: null,
        requestId: null,
      },
    };
  }
  const { accountId: id, reason: why, idempotencyKey: key } = parsed.data;
  return runAdminAction({
    permission: "bank_account.reveal",
    name: "bank_account.reveal",
    idempotencyKey: key,
    call: async (api) => {
      const data = await unwrap(
        api.POST("/v1/admin/payout-accounts/{account_id}/reveal", {
          params: { path: { account_id: id } },
          body: { reason: why },
        }),
      );
      return data.account_number;
    },
  });
}
