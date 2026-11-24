"use server";

import { redirect } from "next/navigation";
import { createApiClient } from "@/lib/api/create-client";
import { getEnv } from "@/lib/env";
import { getSession } from "./session";
import { safeNextPath } from "./idle";

/**
 * Unlock = full re-login (open question 3: the API has no re-auth with a live
 * token). Destroys the session and sends the admin to /login with `next`.
 */
export async function signOutAndReturn(formData: FormData) {
  const next = safeNextPath(String(formData.get("next") ?? "/"));
  const session = await getSession();
  // The locked token is still valid server-side for up to 60 min; revoke it.
  if (session.accessToken) {
    try {
      await createApiClient({ baseUrl: getEnv().API_BASE_URL, token: session.accessToken }).POST("/v1/admin/auth/logout");
    } catch {
      // Best effort.
    }
  }
  session.destroy();
  redirect(`/login?next=${encodeURIComponent(next)}`);
}
