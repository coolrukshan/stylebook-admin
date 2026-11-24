"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ReasonDialog } from "@/components/sb/reason-dialog";
import { reasonDialogs } from "@/components/sb/reason-presets";
import { rowActionLabel } from "@/components/sb/data-table";
import { Button } from "@/components/ui/button";
import { reactivateUser, suspendUser } from "../actions";
import type { UserStatus } from "../map";

/** Suspend (active) or Reactivate (suspended). Hidden by the parent without `user.suspend`. */
export function UserActions({ id, name, status }: { id: string; name: string; status: UserStatus }) {
  const router = useRouter();
  const suspended = status === "suspended";
  return (
    <ReasonDialog
      {...(suspended ? reasonDialogs.reactivateUser(name) : reasonDialogs.suspendUser(name))}
      onConfirm={async (reason, key) => {
        const r = await (suspended ? reactivateUser : suspendUser)(id, reason, key);
        if (r.ok) {
          toast.success(suspended ? `${name} reactivated` : `${name} suspended`);
          router.refresh();
        }
        return r;
      }}
      trigger={
        suspended ? (
          <Button variant="outline" aria-label={rowActionLabel("Reactivate", name)} className="rounded-pill px-4">
            Reactivate
          </Button>
        ) : (
          <Button variant="outline" aria-label={rowActionLabel("Suspend", name)} className="rounded-pill border-danger px-4 text-danger">
            Suspend
          </Button>
        )
      }
    />
  );
}
