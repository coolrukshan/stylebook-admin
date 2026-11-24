"use client";

import { useQuery } from "@tanstack/react-query";
import type { NavCounts } from "@/lib/api/nav-counts";

export const TASK_COUNTS_KEY = ["dashboard", "task-counts"] as const;

/**
 * One query key shared by the sidebar badges and the dashboard panel so they
 * always match. Polls every 60 s, paused while the tab is hidden.
 */
export function useTaskCounts(initial: NavCounts) {
  return useQuery({
    queryKey: TASK_COUNTS_KEY,
    queryFn: async ({ signal }): Promise<NavCounts> => {
      const res = await fetch("/api/dashboard/tasks", { signal, cache: "no-store" });
      if (!res.ok) throw new Error("tasks_unavailable");
      return ((await res.json()) as { counts: NavCounts }).counts;
    },
    initialData: initial,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}
