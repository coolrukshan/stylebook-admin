import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getIronSession } from "iron-session";
import { evaluateSession } from "./idle";
import { sessionOptions, type SessionData } from "./session-options";

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}

/** Admin JWT for the current request, or null if anonymous/expired. Server only. */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  const state = evaluateSession(session, Date.now());
  return state === "anonymous" || state === "expired" ? null : (session.accessToken ?? null);
}

/** True when the session is signed in and not idle/expired. Server only. */
export async function isSessionActive(): Promise<boolean> {
  await connection(); // opt out of prerendering before reading the clock
  return evaluateSession(await getSession(), Date.now()) === "active";
}
