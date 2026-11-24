import type { SessionOptions } from "iron-session";

/**
 * Pure (no `server-only`, no app imports) so it is safe to use from `proxy.ts`
 * as well as server code. Do not add shared state here.
 */
export type SessionData = {
  accessToken?: string;
  adminId?: string;
  adminName?: string;
  /** Epoch ms when the admin JWT expires (60 min, no refresh endpoint). */
  expiresAt?: number;
  /** Epoch ms of the last navigation, used for the 30 min idle lock. */
  lastActiveAt?: number;
  /** Set between password step and TOTP step. Sealed cookie only. */
  partialToken?: string;
  /** Present while enrolling 2FA; never leaves the server except to the setup page render. */
  totpSetup?: { uri: string; secret: string };
};

export const SESSION_COOKIE = "sb_admin";
export const IDLE_LIMIT_MS = 30 * 60 * 1000;

export function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET must be set (32+ characters)");
  }
  return {
    cookieName: SESSION_COOKIE,
    password,
    // Matches the admin JWT lifetime; the cookie never outlives the token.
    ttl: 60 * 60,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  };
}
