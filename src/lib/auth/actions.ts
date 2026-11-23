"use server";

import { redirect } from "next/navigation";
import { getSession } from "./session";
import { safeNextPath } from "./idle";

/**
 * Unlock = full re-login (open question 3: the API has no re-auth with a live
 * token). Destroys the session and sends the admin to /login with `next`.
 */
export async function signOutAndReturn(formData: FormData) {
  const next = safeNextPath(String(formData.get("next") ?? "/"));
  const session = await getSession();
  session.destroy();
  redirect(`/login?next=${encodeURIComponent(next)}`);
}
