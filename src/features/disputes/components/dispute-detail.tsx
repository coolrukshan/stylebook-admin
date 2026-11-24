import { StatusPill } from "@/components/sb/status-pill";
import { formatDateTime } from "@/lib/format/date";
import { formatLkr } from "@/lib/format/money";
import type { Dispute } from "../schemas";
import { disputeState, hoursLeft, salonReply, shortId } from "../status";
import { DecisionButtons } from "./decision-buttons";

export function DisputeDetail({
  dispute: d,
  client,
  salon,
  canDecide,
  now,
}: {
  dispute: Dispute;
  client: string;
  salon: string;
  canDecide: boolean;
  now: Date;
}) {
  const reply = salonReply(d, now);
  const state = disputeState(d);
  const reference = d.booking_id ?? d.order_id;
  return (
    <div className="space-y-6">
      <section aria-labelledby="dispute-title" className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-card">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 id="dispute-title" className="font-mono text-2xl font-semibold text-text">
                {shortId(d.id)}
              </h2>
              <StatusPill status={d.status} />
            </div>
            <p className="mt-1 text-muted-foreground">
              {client} · {salon} · {d.category.replace(/_/g, " ")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Opened {formatDateTime(d.created_at)}
              {reference && <> · Reference <span className="font-mono">{shortId(reference)}</span></>}
              {d.salon_deadline && state === "salon_window" && <> · Salon deadline {formatDateTime(d.salon_deadline)}</>}
            </p>
          </div>
        </header>
        <DecisionButtons id={d.id} code={shortId(d.id)} state={state} hoursLeft={hoursLeft(d.salon_deadline, now)} canDecide={canDecide} />
      </section>

      <section aria-labelledby="conversation" className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-card">
        <h3 id="conversation" className="font-semibold text-text">
          Messages
        </h3>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client</p>
          <p className="mt-1 text-text-2">{d.reason}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Salon{d.salon_responded_at ? ` · ${formatDateTime(d.salon_responded_at)}` : ""}
          </p>
          <p className="mt-1 text-text-2">
            {reply.kind === "replied" ? reply.text : reply.kind === "none_after_48h" ? "No reply after 48 h" : "Waiting for the salon to reply"}
          </p>
          {d.offer_refund && d.offered_refund_cents > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">Offered a refund of {formatLkr(d.offered_refund_cents)}</p>
          )}
        </div>
      </section>

      <section aria-labelledby="evidence" className="rounded-card border border-line bg-surface p-6 shadow-card">
        <h3 id="evidence" className="font-semibold text-text">
          Evidence ({d.evidence_urls.length})
        </h3>
        {d.evidence_urls.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No attachments</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {d.evidence_urls.map((u, i) => (
              <li key={u}>
                <a href={u} target="_blank" rel="noreferrer" className="font-semibold text-amber underline-offset-4 hover:underline">
                  Attachment {i + 1}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {state === "decided" && (
        <section aria-labelledby="outcome" className="rounded-card border border-line bg-surface p-6 shadow-card">
          <h3 id="outcome" className="font-semibold text-text">
            Outcome
          </h3>
          <p className="mt-2 text-text-2">
            {(d.admin_decision ?? d.status).replace(/_/g, " ")}
            {d.resolved_at ? ` on ${formatDateTime(d.resolved_at)}` : ""}
          </p>
          {d.admin_reason && <p className="mt-1 text-sm text-muted-foreground">Reason: {d.admin_reason}</p>}
        </section>
      )}
    </div>
  );
}
