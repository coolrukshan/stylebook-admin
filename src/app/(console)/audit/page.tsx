import { Suspense } from "react";
import { SectionBoundary } from "@/components/sb/section-boundary";
import { CardSkeleton, TableSkeleton } from "@/components/sb/skeletons";
import { TopBar } from "@/components/sb/top-bar";
import { AuditFilterBar } from "@/features/audit/components/audit-filters";
import { AuditTable } from "@/features/audit/components/audit-table";
import { ExportButton } from "@/features/audit/components/export-button";
import { isInvalidRange, parseFilters, toSearchParams } from "@/features/audit/filters";
import { getAdminNames, getAuditEntries } from "@/features/audit/queries";
import { toAuditRow } from "@/features/audit/rows";
import { canExportAudit } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-role";

type SP = Promise<Record<string, string | string[] | undefined>>;

async function Filters({ searchParams, canExport }: { searchParams: SP; canExport: boolean }) {
  const filters = parseFilters(await searchParams, new Date());
  const names = await getAdminNames();
  const query = toSearchParams(filters);
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
      <AuditFilterBar key={query} filters={filters} admins={[...names]} />
      {canExport && <ExportButton query={query} disabled={isInvalidRange(filters)} />}
    </div>
  );
}

async function Results({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const filters = parseFilters(sp, new Date());
  if (isInvalidRange(filters)) {
    return (
      <p role="alert" className="rounded-card border border-line bg-surface p-6 text-text shadow-card">
        The From date is after the To date.
      </p>
    );
  }
  const raw = Array.isArray(sp.cursors) ? sp.cursors.join(",") : sp.cursors;
  // Last entry of the `cursors` stack (lib/pagination pulls nuqs client code, so not imported here).
  const cursor = raw?.split(",").filter(Boolean).at(-1);
  const [{ entries, nextCursor }, names] = await Promise.all([getAuditEntries(filters, cursor), getAdminNames()]);
  return <AuditTable rows={entries.map((e) => toAuditRow(e, names, filters))} nextCursor={nextCursor} />;
}

export default async function AuditPage({ searchParams }: { searchParams: SP }) {
  const me = await requirePermission("audit.view");
  return (
    <>
      <TopBar title="Audit log" subtitle="Every recorded action, newest first" />
      <SectionBoundary title="Couldn't load filters">
        <Suspense fallback={<CardSkeleton className="mb-4 h-24" />}>
          <Filters searchParams={searchParams} canExport={canExportAudit(me)} />
        </Suspense>
      </SectionBoundary>
      <SectionBoundary title="Couldn't load the audit log">
        <Suspense fallback={<TableSkeleton columns={4} />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </SectionBoundary>
      <p className="pt-4 text-sm text-muted-foreground">
        Append-only. Rows can&apos;t be edited or deleted. IP addresses are as recorded by the API; for console actions they
        may be the console server&apos;s address.
      </p>
    </>
  );
}
