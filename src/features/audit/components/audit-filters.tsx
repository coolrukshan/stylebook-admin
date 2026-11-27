import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { roleLabel } from "@/lib/auth/permissions";
import { subject } from "../describe";
import { ACTOR_ROLES, AREAS, toSearchParams, type AuditFilters } from "../filters";

const CONTROL =
  "h-10 rounded-lg border border-line-strong bg-surface px-3 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-amber";

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
    {label}
    {children}
  </label>
);

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * A GET form, so filters live in the URL and a new filter starts at page 1.
 * `key` it on the filters so the fields reset after navigation.
 */
export function AuditFilterBar({
  filters,
  admins,
}: {
  filters: AuditFilters;
  /** Id and name pairs; empty when this viewer can't list admins. */
  admins: [string, string][];
}) {
  const { targetType, targetId, ...rest } = filters;
  return (
    <Form action="/audit" aria-label="Filter the audit log" className="flex flex-wrap items-end gap-3">
      <Field label="From (UTC date)">
        <input type="date" name="from" defaultValue={filters.from} className={CONTROL} />
      </Field>
      <Field label="To (UTC date)">
        <input type="date" name="to" defaultValue={filters.to} className={CONTROL} />
      </Field>
      <Field label="Area">
        <select name="area" defaultValue={filters.area ?? ""} className={CONTROL}>
          <option value="">All areas</option>
          {AREAS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Role">
        <select name="role" defaultValue={filters.role ?? ""} className={CONTROL}>
          <option value="">All roles</option>
          {ACTOR_ROLES.map((r) => (
            <option key={r} value={r}>
              {capitalise(roleLabel(r))}
            </option>
          ))}
        </select>
      </Field>
      {admins.length > 0 && (
        <Field label="Admin">
          <select name="actor" defaultValue={filters.actor ?? ""} className={CONTROL}>
            <option value="">Anyone</option>
            {admins.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {targetType && targetId && (
        <>
          <input type="hidden" name="targetType" value={targetType} />
          <input type="hidden" name="targetId" value={targetId} />
          <p className="flex h-10 items-center gap-2 rounded-pill border border-line-strong bg-soft px-4 text-sm text-text">
            History of {subject(targetType, targetId).label}
            <Link href={`/audit?${toSearchParams(rest)}`} className="font-semibold text-amber underline-offset-4 hover:underline">
              Remove
            </Link>
          </p>
        </>
      )}
      <Button type="submit" className="h-10 rounded-pill px-5">
        Apply
      </Button>
      <Link href="/audit" className="flex h-10 items-center text-sm font-semibold text-amber underline-offset-4 hover:underline">
        Clear filters
      </Link>
    </Form>
  );
}
