import { Lock } from "lucide-react";
import { EmptyState } from "@/components/sb/empty-state";
import { StatusPill } from "@/components/sb/status-pill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { roleLabel, SUPER_ADMIN_ROLE } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/format/date";
import { countGranted, PERMISSION_NAMES } from "../catalogue";
import type { AdminRow } from "../schemas";
import { AccessDialog } from "./access-dialog";

const HEADERS = ["Admin", "Role", "2FA", "Last sign-in", "Status", "Access"];

export function AdminsTable({ admins }: { admins: AdminRow[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <Table aria-label="Admins">
        <TableHeader>
          <TableRow>
            {HEADERS.map((h) => (
              <TableHead key={h} className="px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="px-4 py-3 font-semibold text-text">{a.name}</TableCell>
              <TableCell className="px-4 py-3 capitalize">{roleLabel(a.role)}</TableCell>
              <TableCell className="px-4 py-3">
                {a.twoFactor ? "On" : <StatusPill variant="warning" label="Off" />}
              </TableCell>
              <TableCell className="whitespace-nowrap px-4 py-3">
                {a.lastSignInAt ? formatDate(a.lastSignInAt) : "Never"}
              </TableCell>
              <TableCell className="px-4 py-3">
                <StatusPill variant={a.active ? "success" : "danger"} label={a.active ? "Active" : "Deactivated"} />
              </TableCell>
              <TableCell className="px-4 py-3">
                {a.role === SUPER_ADMIN_ROLE ? (
                  <span className="inline-flex items-center gap-2 text-text-2" title="Super admin always has every permission">
                    <Lock aria-hidden className="size-4" />
                    All permissions (locked)
                  </span>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      {countGranted(a.permissions)} of {PERMISSION_NAMES.length}
                    </span>
                    <AccessDialog id={a.id} name={a.name} permissions={a.permissions} />
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {admins.length === 0 && <EmptyState message="No admin accounts" />}
    </div>
  );
}
