"use server";

import { redirect } from "next/navigation";
import { createApiClient, type ApiClient } from "@/lib/api/create-client";
import { ApiError, errorFromResponse } from "@/lib/api/errors";
import { safeNextPath } from "@/lib/auth/idle";
import { getSession } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { log } from "@/lib/log";
import { GENERIC_FAILURE, messageForStatus, type AuthFormState } from "./messages";
import { loginSchema, recoverySchema, totpSchema } from "./schemas";

const anon = () => createApiClient({ baseUrl: getEnv().API_BASE_URL, token: null });

function nextOf(formData: FormData) {
  return safeNextPath(String(formData.get("next") ?? "/"));
}
function withNext(path: string, next: string) {
  return next === "/" ? path : `${path}?next=${encodeURIComponent(next)}`;
}

/** Maps any failure to safe copy. Credentials, codes and tokens are never logged. */
function fail(error: unknown, action: string): AuthFormState {
  if (error instanceof ApiError) {
    log.warn("admin auth failed", { action, status: error.status, requestId: error.requestId });
    return { ...messageForStatus(error.status, error.retryAfterSeconds), requestId: error.requestId };
  }
  log.warn("admin auth failed", { action });
  return { error: GENERIC_FAILURE };
}

async function call<T>(p: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await p;
  if (data === undefined || !response.ok) {
    throw errorFromResponse(response, error, response.headers.get("x-request-id"));
  }
  return data;
}

/** Stores the final admin session. `me` is fetched with the new token. */
async function establishSession(accessToken: string, expiresIn: number | null | undefined) {
  const api: ApiClient = createApiClient({ baseUrl: getEnv().API_BASE_URL, token: accessToken });
  const me = await call(api.GET("/v1/admin/me"));
  const session = await getSession();
  const now = Date.now();
  session.accessToken = accessToken;
  session.adminId = me.id;
  session.adminName = me.full_name;
  session.expiresAt = now + (expiresIn ?? 3600) * 1000;
  session.lastActiveAt = now;
  session.partialToken = undefined;
  session.totpSetup = undefined;
  await session.save();
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const next = nextOf(formData);
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter your email and password." };

  let target: string;
  try {
    const res = await call(anon().POST("/v1/admin/auth/login", { body: parsed.data }));
    const session = await getSession();
    if (res.access_token) {
      await establishSession(res.access_token, res.expires_in);
      target = next;
    } else if (res.partial_token && res.totp_setup_required && res.totp_uri && res.totp_secret) {
      session.partialToken = res.partial_token;
      session.totpSetup = { uri: res.totp_uri, secret: res.totp_secret };
      await session.save();
      target = withNext("/login/2fa/setup", next);
    } else if (res.partial_token && res.requires_totp) {
      session.partialToken = res.partial_token;
      session.totpSetup = undefined;
      await session.save();
      target = withNext("/login/2fa", next);
    } else {
      return { error: GENERIC_FAILURE };
    }
  } catch (e) {
    return fail(e, "login");
  }
  redirect(target);
}

export async function verifyTotpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const next = nextOf(formData);
  const parsed = totpSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: "Enter the 6-digit code." };
  const session = await getSession();
  if (!session.partialToken) redirect("/login");
  try {
    const res = await call(
      anon().POST("/v1/admin/auth/totp", { body: { partial_token: session.partialToken, totp_code: parsed.data.code } }),
    );
    if (!res.access_token) return { error: GENERIC_FAILURE };
    await establishSession(res.access_token, res.expires_in);
  } catch (e) {
    return fail(e, "totp");
  }
  redirect(next);
}

export async function recoveryAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const next = nextOf(formData);
  const parsed = recoverySchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: "Enter a recovery code." };
  const session = await getSession();
  if (!session.partialToken) redirect("/login");
  try {
    const res = await call(
      anon().POST("/v1/admin/auth/recovery", {
        body: { partial_token: session.partialToken, recovery_code: parsed.data.code },
      }),
    );
    if (!res.access_token) return { error: GENERIC_FAILURE };
    await establishSession(res.access_token, res.expires_in);
  } catch (e) {
    return fail(e, "recovery");
  }
  redirect(next);
}

export type SetupState = AuthFormState & { recoveryCodes?: string[] };

/**
 * Enrolment confirm. The session becomes active here, but recovery codes are
 * returned to the page (in memory only) so the admin can save them before
 * continuing; `continueAfterSetup` performs the redirect.
 */
export async function setupTotpAction(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const parsed = totpSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: "Enter the 6-digit code." };
  const session = await getSession();
  if (!session.partialToken) redirect("/login");
  try {
    const res = await call(
      anon().POST("/v1/admin/auth/totp/setup", {
        body: { partial_token: session.partialToken, totp_code: parsed.data.code },
      }),
    );
    await establishSession(res.access_token, res.expires_in);
    return { recoveryCodes: res.recovery_codes };
  } catch (e) {
    return fail(e, "totp_setup");
  }
}

export async function continueAfterSetup(formData: FormData) {
  redirect(nextOf(formData));
}

/** Abandons the password step (Back to sign in). */
export async function cancelPendingLogin(formData: FormData) {
  const session = await getSession();
  session.partialToken = undefined;
  session.totpSetup = undefined;
  await session.save();
  redirect(withNext("/login", nextOf(formData)));
}

export async function logoutAction() {
  const session = await getSession();
  if (session.accessToken) {
    try {
      await createApiClient({ baseUrl: getEnv().API_BASE_URL, token: session.accessToken }).POST("/v1/admin/auth/logout");
    } catch {
      // Best effort; the local session is destroyed regardless.
    }
  }
  session.destroy();
  redirect("/login");
}
