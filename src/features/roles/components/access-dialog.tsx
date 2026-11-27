"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useActionErrorHandler } from "@/components/sb/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updateAdminAccess } from "../actions";
import { isGranted, NOT_GRANTABLE, PERMISSION_GROUPS, PERMISSION_NAMES, permissionLabel, type PermissionName } from "../catalogue";

const initial = (permissions: readonly string[]) => new Set(PERMISSION_NAMES.filter((n) => isGranted(permissions, n)));

function ChangeList({ title, names }: { title: string; names: PermissionName[] }) {
  if (names.length === 0) return null;
  return (
    <section>
      <h3 className="font-semibold text-text">{title}</h3>
      <ul aria-label={title} className="mt-1 list-disc space-y-1 pl-5 text-text-2">
        {names.map((n) => (
          <li key={n}>{permissionLabel(n)}</li>
        ))}
      </ul>
    </section>
  );
}

/** Per-admin permission checklist, then a review step. The API takes no reason. */
export function AccessDialog({ id, name, permissions }: { id: string; name: string; permissions: string[] }) {
  const router = useRouter();
  const handleStale = useActionErrorHandler();
  const [open, setOpen] = useState(false);
  const [original, setOriginal] = useState(() => initial(permissions));
  const [selected, setSelected] = useState(original);
  const [reviewing, setReviewing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef("");
  const busy = useRef(false);

  const added = PERMISSION_NAMES.filter((n) => selected.has(n) && !original.has(n));
  const removed = PERMISSION_NAMES.filter((n) => !selected.has(n) && original.has(n));
  const changed = added.length + removed.length > 0;

  function openDialog() {
    const current = initial(permissions);
    setOriginal(current);
    setSelected(current);
    setReviewing(false);
    setError(null);
    setOpen(true);
  }

  function toggle(n: PermissionName, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(n);
      else next.delete(n);
      return next;
    });
  }

  async function confirm() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const r = await updateAdminAccess({ adminId: id, grant: added, revoke: removed }, key.current);
      if (r.ok) {
        toast.success(`Access updated for ${name}`);
        setOpen(false);
        router.refresh();
      } else if (handleStale(r.error)) setOpen(false);
      else setError(r.error.message);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" aria-label={`Edit access for ${name}`} onClick={openDialog}>
        Edit access
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent showCloseButton={false} className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {reviewing ? `Change access for ${name}?` : `Access for ${name}`}
            </DialogTitle>
            <DialogDescription>
              {reviewing
                ? "Applies from their next request. The audit log records the new permission list, but not the old one or a reason."
                : "Each permission is granted to this account only. Viewing and changing are separate permissions."}
            </DialogDescription>
          </DialogHeader>

          {reviewing ? (
            <div className="space-y-4">
              <ChangeList title="Added" names={added} />
              <ChangeList title="Removed" names={removed} />
            </div>
          ) : (
            <div className="space-y-4">
              {PERMISSION_GROUPS.map((group) => (
                <fieldset key={group.title}>
                  <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</legend>
                  <div className="mt-2 space-y-2">
                    {group.items.map((item) => {
                      const locked = NOT_GRANTABLE.has(item.name) && !original.has(item.name);
                      return (
                        <div key={item.name}>
                          <label className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              className="mt-0.5 size-4 accent-success"
                              aria-label={`${name}: ${item.label}`}
                              checked={selected.has(item.name)}
                              disabled={locked}
                              aria-describedby={locked ? `${id}-${item.name}-locked` : undefined}
                              onChange={(e) => toggle(item.name, e.target.checked)}
                            />
                            <span className={locked ? "text-muted-foreground" : "text-text"}>
                              {item.label}
                            </span>
                          </label>
                          {locked && (
                            <p id={`${id}-${item.name}-locked`} className="pl-7 text-xs text-muted-foreground">
                              Can&apos;t be granted here: the API would let this admin make themselves Super admin.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <DialogFooter>
            {reviewing ? (
              <>
                <Button type="button" variant="outline" disabled={pending} onClick={() => setReviewing(false)}>
                  Back
                </Button>
                <Button type="button" disabled={pending} aria-busy={pending} onClick={() => void confirm()}>
                  {pending ? "Saving…" : "Confirm changes"}
                </Button>
              </>
            ) : (
              <>
                <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                <Button
                  type="button"
                  disabled={!changed}
                  onClick={() => {
                    key.current = crypto.randomUUID();
                    setError(null);
                    setReviewing(true);
                  }}
                >
                  Review changes
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
