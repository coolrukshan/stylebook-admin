import { EnvBadge } from "./env-badge";
import { GlobalSearch } from "./global-search";

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex items-start justify-between gap-6 pb-6">
      <div>
        <h1 className="text-[32px] font-semibold leading-tight text-text">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <EnvBadge />
        <GlobalSearch />
      </div>
    </header>
  );
}
