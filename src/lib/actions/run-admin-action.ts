import "server-only";
import { getApiClient } from "@/lib/api/client";
import type { ApiClient } from "@/lib/api/create-client";
import { toActionResult, type ActionResult } from "@/lib/api/errors";
import { assertPermission } from "@/lib/auth/require-role";
import type { PermissionKey } from "@/lib/auth/permissions";
import { log } from "@/lib/log";

/**
 * The only way Server Actions should call the API for writes.
 *  1. Enforces `permission` on the server (UI checks are convenience only).
 *  2. Builds the API client with the caller's `idempotencyKey` (stable per
 *     form open; see ReasonDialog) so a timeout retry does not create a second
 *     audit row.
 *  3. Returns a serialisable ActionResult; ApiErrors never leak raw messages.
 *
 * Never pass request bodies or reasons to logging; `log` redacts anyway.
 */
export async function runAdminAction<T>(opts: {
  permission: PermissionKey;
  idempotencyKey?: string;
  /** Short name for logs, e.g. "payout_account.reject". No PII. */
  name: string;
  call: (api: ApiClient) => Promise<T>;
}): Promise<ActionResult<T>> {
  const result = await toActionResult(async () => {
    await assertPermission(opts.permission);
    const api = await getApiClient({ idempotencyKey: opts.idempotencyKey });
    return opts.call(api);
  });
  if (!result.ok) {
    log.warn("admin action failed", {
      action: opts.name,
      status: result.error.status,
      code: result.error.code,
      requestId: result.error.requestId,
    });
  }
  return result;
}
