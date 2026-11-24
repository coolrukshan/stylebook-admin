import { Suspense } from "react";
import { SectionBoundary } from "@/components/sb/section-boundary";
import { TableSkeleton } from "@/components/sb/skeletons";
import { TopBar } from "@/components/sb/top-bar";
import { UserFilters } from "@/features/users/components/user-filters";
import { UserSearch } from "@/features/users/components/user-search";
import { UsersTable } from "@/features/users/components/users-table";
import { parseStatusFilter } from "@/features/users/map";
import { getUsers } from "@/features/users/queries";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-role";

type SP = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Results({ searchParams, canSuspend }: { searchParams: SP; canSuspend: boolean }) {
  const sp = await searchParams;
  const q = first(sp.q)?.trim() ?? "";
  const status = parseStatusFilter(sp.status);
  const raw = Array.isArray(sp.cursors) ? sp.cursors.join(",") : sp.cursors;
  // Last entry of the `cursors` stack (lib/pagination pulls nuqs client code, so not imported here).
  const cursor = raw?.split(",").filter(Boolean).at(-1);
  const { rows, nextCursor } = await getUsers({ q, status, cursor });
  return (
    <>
      <UserSearch shown={rows.length} hasMore={Boolean(nextCursor)} />
      <UserFilters current={status} q={q} />
      <UsersTable rows={rows} nextCursor={nextCursor} canSuspend={canSuspend} query={q} />
    </>
  );
}

export default async function UsersPage({ searchParams }: { searchParams: SP }) {
  const me = await requirePermission("users.view");
  return (
    <>
      <TopBar title="Users" subtitle="Clients and partner staff" />
      <SectionBoundary title="Couldn't load users">
        <Suspense fallback={<TableSkeleton columns={7} />}>
          <Results searchParams={searchParams} canSuspend={hasPermission(me, "user.suspend")} />
        </Suspense>
      </SectionBoundary>
    </>
  );
}
