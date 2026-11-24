import { Suspense } from "react";
import { LogOut, Scissors } from "lucide-react";
import { getNavCounts, type NavCountKey, type NavCounts } from "@/lib/api/nav-counts";
import { hasPermission, roleLabel, type AdminIdentity } from "@/lib/auth/permissions";
import { logoutAction } from "@/features/auth/actions";
import { LiveNav } from "./live-nav";
import { SidebarNav } from "./sidebar-nav";

export { SidebarNav };
import { NAV_ITEMS, type NavItem } from "./nav-config";

export type SidebarAdmin = AdminIdentity & { full_name: string; totp_enabled?: boolean };

export function visibleNavItems(me: AdminIdentity): NavItem[] {
  return NAV_ITEMS.filter((item) => hasPermission(me, item.permission));
}

async function SidebarNavWithCounts({ items }: { items: readonly NavItem[] }) {
  const keys = items.flatMap((i) => (i.badge ? [i.badge as NavCountKey] : []));
  const counts = keys.length ? await getNavCounts(keys) : {};
  return <LiveNav items={items} initial={counts} />;
}

/** 220px dark sidebar. Badge counts stream in; the nav itself never blocks. */
export function Sidebar({ me }: { me: SidebarAdmin }) {
  const items = visibleNavItems(me);
  return (
    <aside className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col bg-gradient-to-b from-ink to-ink text-sidebar-text">
      <div className="flex items-center gap-3 px-6 pb-6 pt-8">
        <Scissors aria-hidden className="size-6 text-white" />
        <div>
          <p className="text-lg font-semibold leading-tight text-white">StyleBook</p>
          <p className="text-xs text-subtle">Admin console</p>
        </div>
      </div>
      <Suspense fallback={<SidebarNav items={items} />}>
        <SidebarNavWithCounts items={items} />
      </Suspense>
      <div className="m-3 border-t border-white/10 px-3 pt-4">
        <p className="text-sm font-semibold text-white">{me.full_name}</p>
        <p className="mt-1 text-xs leading-relaxed text-subtle">
          {roleLabel(me.role)} · 2FA {me.totp_enabled === false ? "off" : "on"} · session locks after 30 min idle
        </p>
        <form action={logoutAction} className="mt-3">
          <button
            type="submit"
            aria-label="Sign out"
            className="flex items-center gap-2 rounded-input text-sm text-sidebar-text outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-amber"
          >
            <LogOut aria-hidden className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
