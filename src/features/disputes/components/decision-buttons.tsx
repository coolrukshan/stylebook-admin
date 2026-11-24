"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { rowActionLabel } from "@/components/sb/data-table";
import { ReasonDialog } from "@/components/sb/reason-dialog";
import { reasonDialogs } from "@/components/sb/reason-presets";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/api/errors";
import { decideDispute, getDisputeStatus } from "../actions";
import type { Decision } from "../schemas";
import type { DisputeState } from "../status";

const DECIDED = new Set(["resolved", "rejected"]);

export function DecisionButtons({
  id,
  code,
  state,
  hoursLeft,
  canDecide,
}: {
  id: string;
  /** Short display id. */
  code: string;
  state: DisputeState;
  /** Whole hours left in the salon window, computed on the server (no clock in the client). */
  hoursLeft: number;
  canDecide: boolean;
}) {
  const router = useRouter();
  if (!canDecide || state === "decided") return null;
  const locked = state === "salon_window";
  const lockNote = locked ? `Salon has ${hoursLeft} h left` : null;
  const noteId = `dispute-note-${id}`;

  function decide(decision: Decision, success: string) {
    return async (reason: string, key: string): Promise<ActionResult<unknown>> => {
      let r = await decideDispute(id, decision, reason, key);
      if (!r.ok && r.error.status === 0) {
        // Timeout: re-read before allowing a retry (spec "Checking the result...").
        const check = await getDisputeStatus(id);
        if (check.ok && DECIDED.has(check.data.status)) r = { ok: true, data: { status: check.data.status } };
        else
          return {
            ok: false,
            error: { ...r.error, message: "Couldn't confirm the result. It has not been applied yet; check and try again." },
          };
      }
      if (r.ok) {
        toast.success(success);
        router.refresh();
      }
      return r;
    };
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        {locked ? (
          <>
            <Button disabled aria-describedby={noteId} className="rounded-pill bg-success px-4 text-white">
              Full refund
            </Button>
            <Button disabled variant="secondary" aria-describedby={noteId} className="rounded-pill px-4">
              50%
            </Button>
            <Button disabled variant="outline" aria-describedby={noteId} className="rounded-pill px-4">
              Reject
            </Button>
          </>
        ) : (
          <>
            <ReasonDialog
              {...reasonDialogs.refundDispute(code)}
              onConfirm={decide("full_refund", "Full refund issued")}
              trigger={
                <Button aria-label={rowActionLabel("Full refund", code)} className="rounded-pill bg-success px-4 text-white hover:bg-success/90">
                  Full refund
                </Button>
              }
            />
            <Button disabled variant="secondary" aria-describedby={noteId} aria-label={rowActionLabel("50%", code)} className="rounded-pill px-4">
              50%
            </Button>
            <ReasonDialog
              {...reasonDialogs.rejectDispute(code)}
              onConfirm={decide("reject", "Dispute rejected")}
              trigger={
                <Button variant="outline" aria-label={rowActionLabel("Reject", code)} className="rounded-pill border-danger px-4 text-danger">
                  Reject
                </Button>
              }
            />
          </>
        )}
      </div>
      <p id={noteId} className="text-xs text-muted-foreground">
        {lockNote ?? "50% needs the dispute amount from the API, which is not available yet."}
      </p>
    </div>
  );
}
