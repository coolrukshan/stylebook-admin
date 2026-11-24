"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { ReasonDialog } from "@/components/sb/reason-dialog";
import { reasonDialogs } from "@/components/sb/reason-presets";
import { useActionErrorHandler } from "@/components/sb/use-action-feedback";
import { Button } from "@/components/ui/button";
import { TASK_COUNTS_KEY } from "@/features/dashboard/use-task-counts";
import type { ActionResult } from "@/lib/api/errors";
import { approveApplication, rejectApplication, requestApplicationInfo } from "../actions";

export function DecisionActions({
  id,
  salon,
  nextId,
}: {
  id: string;
  salon: string;
  /** Next application in the queue, computed on the server. */
  nextId: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const handleStale = useActionErrorHandler();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const approveKey = useRef(crypto.randomUUID());

  function done(message: string) {
    toast.success(message);
    void queryClient.invalidateQueries({ queryKey: TASK_COUNTS_KEY });
    router.push(nextId ? `/applications/${nextId}` : "/applications");
    router.refresh();
  }

  function approve() {
    setError(null);
    start(async () => {
      const r = await approveApplication(id, approveKey.current);
      if (r.ok) return done(`${salon} approved`);
      if (handleStale(r.error)) return;
      setError(r.error.message);
    });
  }

  const reasoned =
    (fn: (id: string, reason: string, key?: string) => Promise<ActionResult<{ status: string }>>, success: string) =>
    async (reason: string, key: string) => {
      const r = await fn(id, reason, key);
      if (r.ok) done(success);
      return r;
    };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={approve}
          disabled={pending}
          aria-busy={pending}
          className="h-10 rounded-pill bg-success px-5 text-white hover:bg-success/90"
        >
          <Check aria-hidden />
          Approve
        </Button>
        <ReasonDialog
          {...reasonDialogs.requestInfo(salon)}
          onConfirm={reasoned(requestApplicationInfo, `Info requested from ${salon}`)}
          trigger={<Button variant="secondary" className="h-10 rounded-pill px-5" disabled={pending}>Request info</Button>}
        />
        <ReasonDialog
          {...reasonDialogs.rejectSalon(salon)}
          onConfirm={reasoned(rejectApplication, `${salon} rejected`)}
          trigger={<Button variant="outline" className="h-10 rounded-pill border-danger px-5 text-danger" disabled={pending}>Reject</Button>}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
