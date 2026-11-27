import { maskPii } from "@/features/search/mask-pii";
import { actorLabel, describeAction, subject } from "./describe";
import { toSearchParams, type AuditFilters } from "./filters";
import type { AuditEntry } from "./schemas";

export type AuditRow = {
  id: string;
  at: string;
  who: string;
  action: string;
  subjectLabel: string;
  subjectHref: string | null;
  historyHref: string;
  reason: string;
  ip: string;
};

/** Display rows only: free text is masked here, on the server. */
export function toAuditRow(e: AuditEntry, names: ReadonlyMap<string, string>, filters: AuditFilters): AuditRow {
  const s = subject(e.target_type, e.target_id);
  const history = toSearchParams({
    from: filters.from,
    to: filters.to,
    targetType: e.target_type,
    targetId: e.target_id,
  });
  return {
    id: e.id,
    at: e.created_at,
    who: actorLabel(e.actor_role, e.actor_id, names),
    action: describeAction(e.action),
    subjectLabel: s.label,
    subjectHref: s.href,
    historyHref: `/audit?${history}`,
    reason: maskPii(e.reason),
    ip: e.ip_address ?? "",
  };
}
