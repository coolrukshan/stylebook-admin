"use client";

import type { NavCounts } from "@/lib/api/nav-counts";
import { useTaskCounts } from "@/features/dashboard/use-task-counts";
import { SidebarNav } from "./sidebar-nav";
import type { NavItem } from "./nav-config";

/** Sidebar nav with badges kept fresh by the shared polling query. */
export function LiveNav({ items, initial }: { items: readonly NavItem[]; initial: NavCounts }) {
  const { data } = useTaskCounts(initial);
  return <SidebarNav items={items} counts={data} />;
}
