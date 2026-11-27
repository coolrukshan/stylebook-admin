import { Suspense } from "react";
import { SectionBoundary } from "@/components/sb/section-boundary";
import { TableSkeleton } from "@/components/sb/skeletons";
import { TopBar } from "@/components/sb/top-bar";
import { AdminsTable } from "@/features/roles/components/admins-table";
import { getAdmins } from "@/features/roles/queries";
import { requirePermission } from "@/lib/auth/require-role";

async function Admins() {
  const { admins, truncated } = await getAdmins();
  return (
    <>
      <AdminsTable admins={admins} />
      {truncated && <p className="pt-2 text-sm text-muted-foreground">Showing the first {admins.length} admins.</p>}
    </>
  );
}

export default async function RolesPage() {
  await requirePermission("admin.manage");
  return (
    <>
      <TopBar title="Admin roles" subtitle="Who can do what in this console" />
      <SectionBoundary title="Couldn't load admins">
        <Suspense fallback={<TableSkeleton columns={6} />}>
          <Admins />
        </Suspense>
      </SectionBoundary>
      <p className="pt-4 text-sm text-muted-foreground">
        Super admin is locked to all permissions. Every permission change is written to the audit log.
      </p>
    </>
  );
}
