import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiClient } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/session";
import { hrefFor, isSearchType, type SearchResult } from "@/features/search/group-results";
import { maskPii } from "@/features/search/mask-pii";

const querySchema = z.string().trim().min(2).max(200);
const HEADERS = { "Cache-Control": "no-store" };

/**
 * Thin normalising proxy over GET /v1/admin/search. Never logs the query or
 * the response (may contain PII) and never forwards raw API error text.
 */
export async function GET(request: NextRequest) {
  if (!(await getAccessToken())) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401, headers: HEADERS });
  }
  const q = querySchema.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!q.success) return NextResponse.json({ error: "invalid_query" }, { status: 400, headers: HEADERS });

  try {
    const api = await getApiClient();
    const { data, response } = await api.GET("/v1/admin/search", {
      params: { query: { q: q.data, limit: 20 } },
      signal: request.signal,
    });
    if (response.status === 401) return NextResponse.json({ error: "unauthenticated" }, { status: 401, headers: HEADERS });
    if (response.status === 403) return NextResponse.json({ results: [] }, { headers: HEADERS });
    if (!data) return NextResponse.json({ error: "unavailable" }, { status: 502, headers: HEADERS });

    const results: SearchResult[] = data.items.flatMap((i) =>
      isSearchType(i.type)
        ? [{
            type: i.type,
            id: i.id,
            title: i.title,
            subtitle: maskPii(i.subtitle),
            status: i.status ?? null,
            createdAt: i.created_at,
            href: hrefFor(i.type, i.id),
          }]
        : [],
    );
    return NextResponse.json({ results }, { headers: HEADERS });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502, headers: HEADERS });
  }
}
