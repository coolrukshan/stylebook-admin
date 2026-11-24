"use client";

import Link from "next/link";
import type { NavCounts } from "@/lib/api/nav-counts";
import { useTaskCounts } from "../use-task-counts";
import type { Task } from "../tasks";

export function TasksPanel({ tasks, initial }: { tasks: readonly Task[]; initial: NavCounts }) {
  const { data } = useTaskCounts(initial);
  const rows = tasks.flatMap((t) => {
    const c = data[t.key];
    return c && c.count > 0 ? [{ task: t, text: c.capped ? `${c.count}+` : String(c.count) }] : [];
  });
  return (
    <section aria-labelledby="attention" className="rounded-card border border-line bg-surface p-6 shadow-card">
      <h2 id="attention" className="text-xl font-semibold text-text">Needs your attention</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-muted-foreground">Nothing needs your attention</p>
      ) : (
        <ul className="mt-4">
          {rows.map(({ task, text }) => (
            <li key={task.key} className="flex items-center gap-4 border-b border-line py-4 last:border-0">
              <span className="grid h-10 min-w-12 place-items-center rounded-input bg-amber-tint px-2 font-semibold text-amber-dark">{text}</span>
              <span className="flex-1 text-text">{task.label}</span>
              <Link href={task.href} className="font-semibold text-amber underline-offset-4 hover:underline">
                Open<span className="sr-only">: {task.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
