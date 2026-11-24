import { NextResponse } from "next/server";
import { getApplication } from "@/features/applications/queries";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { getEnv } from "@/lib/env";
import { log } from "@/lib/log";

/**
 * Streams one application document to the viewer so the storage URL never
 * reaches the browser. Documents can contain a NIC (PII): permission is
 * re-checked, the response is not cacheable, and only ids are logged.
 * GAP: the API has no audited document-view endpoint, so this view is not
 * audited server-side yet.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string; index: string }> }) {
  const { id, index } = await ctx.params;
  const me = await getCurrentAdmin();
  if (!me) return new NextResponse(null, { status: 401 });
  if (!hasPermission(me, "salon_application.approve")) return new NextResponse(null, { status: 403 });

  const i = Number(index);
  if (!Number.isInteger(i) || i < 0) return new NextResponse(null, { status: 404 });

  let url: string | undefined;
  try {
    url = (await getApplication(id)).documents[i]?.url;
  } catch {
    return new NextResponse(null, { status: 404 });
  }
  if (!url) return new NextResponse(null, { status: 404 });

  let target: URL;
  try {
    target = new URL(url, getEnv().API_BASE_URL);
  } catch {
    return new NextResponse(null, { status: 502 });
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") return new NextResponse(null, { status: 502 });

  // The admin token is never sent to the document host.
  const upstream = await fetch(target, { cache: "no-store", signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!upstream?.ok || !upstream.body) {
    log.warn("application document unavailable", { applicationId: id, index: i, status: upstream?.status ?? 0 });
    return new NextResponse(null, { status: 502 });
  }
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
