"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActivePath } from "./nav-config";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const active = isActivePath(usePathname(), href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center justify-between rounded-input px-4 py-3 text-[15px] text-sidebar-text outline-none transition-colors",
        "hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-amber",
        active && "bg-white/10 font-semibold text-white",
      )}
    >
      {children}
    </Link>
  );
}
