import { MapPin } from "lucide-react";
import { StatusPill } from "@/components/sb/status-pill";
import { formatDateTime } from "@/lib/format/date";
import { buildTiles, photoIndexes } from "../document-tiles";
import type { ApplicationDetail as Detail } from "../schemas";
import { isActionable } from "../status";
import { AiCheckPanel } from "./ai-check-panel";
import { DecisionActions } from "./decision-actions";
import { DocumentTile } from "./document-viewer";

/** Right card. Server Component; only tiles and actions are client islands. */
export function ApplicationDetail({ app, nextId }: { app: Detail; nextId: string | null }) {
  const { tiles } = buildTiles(app.documents);
  const photos = photoIndexes(app.documents);
  const subtitle = [app.address, `owner ${app.owner_name}`].filter(Boolean).join(" · ");
  const extra = [
    app.business_registration && `Registration ${app.business_registration}`,
    typeof app.staff_count === "number" && `${app.staff_count} staff`,
  ].filter(Boolean);

  return (
    <article aria-labelledby="app-title" className="space-y-5 rounded-card border border-line bg-surface p-6 shadow-card">
      <header>
        <div className="flex items-center gap-3">
          <h2 id="app-title" className="text-2xl font-semibold text-text">
            {app.salon_name}
          </h2>
          <StatusPill status={app.status} />
        </div>
        <p className="mt-1 text-muted-foreground">{subtitle}</p>
        {extra.length > 0 && <p className="mt-1 text-sm text-muted-foreground">{extra.join(" · ")}</p>}
        {app.services_description && <p className="mt-2 text-sm text-text-2">{app.services_description}</p>}
      </header>

      <section aria-label="Documents" className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <DocumentTile
            key={t.key}
            applicationId={app.id}
            label={t.label}
            state={t.state}
            items={(t.key === "photos" ? photos : t.index === undefined ? [] : [t.index]).map((index, n) => ({
              index,
              label: `${t.label} ${n + 1}`,
            }))}
          />
        ))}
      </section>

      <AiCheckPanel summary={null} />

      <div className="flex items-center gap-3 rounded-input border border-line bg-soft p-4 text-sm text-muted-foreground">
        <MapPin aria-hidden className="size-5 shrink-0 text-amber" />
        <span>{[app.address, app.city].filter(Boolean).join(", ") || "No address provided"}</span>
      </div>

      {isActionable(app.status) ? (
        <DecisionActions id={app.id} salon={app.salon_name} nextId={nextId} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Read only.
          {app.decided_by_name && ` Decided by ${app.decided_by_name}`}
          {app.decided_at && ` on ${formatDateTime(app.decided_at)}`}
          {app.reason && ` · Reason: ${app.reason}`}
        </p>
      )}

      {app.history.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-text">History ({app.history.length})</summary>
          <ul className="mt-2 space-y-2">
            {app.history.map((h) => (
              <li key={`${h.timestamp}-${h.action}`} className="text-muted-foreground">
                <span className="font-medium text-text">{h.action.replace(/_/g, " ")}</span> · {h.actor_name} ·{" "}
                {formatDateTime(h.timestamp)}
                {h.reason && <span className="block">{h.reason}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
