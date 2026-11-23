import "server-only";
import { forbidden, redirect } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { getCurrentAdmin } from "./current-admin";
import { hasPermission, type PermissionKey } from "./permissions";

/**
 * Page guard. Anonymous -> /login; missing permission -> 403 page (forbidden.tsx).
 * Call before fetching any data.
 */
export async function requirePermission(key: PermissionKey) {
  const me = await getCurrentAdmin();
  if (!me) redirect("/login");
  if (!hasPermission(me, key)) forbidden();
  return me;
}

/**
 * Server Action guard. Throws ApiError(403) so runAdminAction returns an
 * ActionResult the client turns into a toast + refresh, instead of a page.
 */
export async function assertPermission(key: PermissionKey) {
  const me = await getCurrentAdmin();
  if (!me) redirect("/login");
  if (!hasPermission(me, key)) throw new ApiError({ status: 403, code: "FORBIDDEN" });
  return me;
}
