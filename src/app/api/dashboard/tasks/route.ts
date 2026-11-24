import { NextResponse } from "next/server";
import { getNavCounts } from "@/lib/api/nav-counts";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { allowedTasks } from "@/features/dashboard/tasks";

/** Task counts for the dashboard panel and sidebar badges (polled every 60 s). */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const me = await getCurrentAdmin();
    if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401, headers });
    const counts = await getNavCounts(allowedTasks(me).map((t) => t.key));
    return NextResponse.json({ counts }, { headers });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502, headers });
  }
}
