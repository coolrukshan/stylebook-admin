import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { safeCsv } from "@/features/audit/csv";
import { isInvalidRange, parseFilters, toApiQuery } from "@/features/audit/filters";
import { getApiClient } from "@/lib/api/client";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { canExportAudit } from "@/lib/auth/permissions";
import { log } from "@/lib/log";

const fail = (status: number, message: string) =>
  NextResponse.json({ message }, { status, headers: { "Cache-Control": "private, no-store" } });

const FAILED = "Couldn't export the audit log. Try again.";

/**
 * CSV download of the filtered audit log. The file holds emails, IPs and free
 * text, so it is never cached, and formula cells are neutralised.
 * GAP: the API does not audit exports, so this one is only in the server log.
 */
export async function GET(req: Request) {
  try {
    const me = await getCurrentAdmin();
    if (!me) return fail(401, "Your session has expired. Please sign in again.");
    if (!canExportAudit(me)) return fail(403, "You don't have permission to export the audit log.");

    const filters = parseFilters(Object.fromEntries(new URL(req.url).searchParams), new Date());
    if (isInvalidRange(filters)) return fail(422, "The From date is after the To date.");

    // Up to 10,000 rows: allow longer than the default API timeout.
    const api = await getApiClient({ timeoutMs: 60_000 });
    const { data, error, response } = await api.GET("/v1/admin/audit/export", {
      params: { query: toApiQuery(filters) },
      parseAs: "text",
    });
    if (!response.ok) {
      log.warn("audit export failed", { adminId: me.id, status: response.status });
      const code = (error as { code?: unknown } | undefined)?.code;
      if (code === "MAX_EXPORT_EXCEEDED") {
        return fail(422, "More than 10,000 rows match. Narrow the date range and try again.");
      }
      return fail(response.status === 403 ? 403 : 502, FAILED);
    }

    const csv = safeCsv(typeof data === "string" ? data : "");
    log.info("audit export", { adminId: me.id });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit_log_${filters.from}_${filters.to}.csv"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    unstable_rethrow(error); // let Next see its own dynamic-rendering signals
    log.warn("audit export failed", { name: error instanceof Error ? error.name : "unknown" });
    return fail(502, FAILED);
  }
}
