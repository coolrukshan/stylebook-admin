import { getIronSession, nextProxyCookies } from "iron-session";
import { NextResponse, type NextRequest } from "next/server";
import { evaluateSession, safeNextPath } from "@/lib/auth/idle";
import { sessionOptions, type SessionData } from "@/lib/auth/session-options";

/**
 * Optimistic checks only (docs: proxy is not an authorization layer). Real
 * enforcement happens in requirePermission / assertPermission and the API.
 * Imports are pure modules; no shared state.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAuthPage = pathname === "/login" || pathname.startsWith("/login/") || pathname === "/lock";

  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    nextProxyCookies(request, response),
    sessionOptions(),
  );
  const state = evaluateSession(session, Date.now());

  const isApi = pathname.startsWith("/api/");

  if (state === "anonymous" || state === "expired") {
    if (isAuthPage) return response;
    // fetch() callers (search, task polling) need a status, not a login page.
    if (isApi) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", safeNextPath(pathname + search));
    return NextResponse.redirect(url);
  }

  if (state === "idle") {
    if (isAuthPage) return response;
    if (isApi) return NextResponse.json({ error: "locked" }, { status: 401 });
    const url = new URL("/lock", request.url);
    url.searchParams.set("next", safeNextPath(pathname + search));
    return NextResponse.redirect(url);
  }

  // Active. Prefetches must not extend the idle window.
  const isPrefetch =
    request.headers.has("next-router-prefetch") ||
    request.headers.get("purpose") === "prefetch";
  if (!isPrefetch) {
    session.lastActiveAt = Date.now();
    await session.save();
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|woff2?)$).*)"],
};
