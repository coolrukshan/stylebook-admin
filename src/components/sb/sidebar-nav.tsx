import type { NavCounts } from "@/lib/api/nav-counts";
import { CountBadge } from "./count-badge";
import { NavLink } from "./nav-link";
import type { NavItem } from "./nav-config";

/** Pure list; counts are optional so it can render before they resolve. */
export function SidebarNav({ items, counts = {} }: { items: readonly NavItem[]; counts?: NavCounts }) {
  return (
    <nav aria-label="Main" className="flex-1 overflow-y-auto px-3">
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.href}>
            <NavLink href={item.href}>
              <span>{item.label}</span>
              {item.badge && <CountBadge count={counts[item.badge]} label={`pending in ${item.label}`} />}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
