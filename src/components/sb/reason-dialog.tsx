"use client";

import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { OTHER_CODE, type ReasonDialogConfig } from "./reason-presets";
import { useActionErrorHandler } from "./use-action-feedback";

export const OTHER_MIN = 10; // stricter than the API (3), per spec
export const OTHER_MAX = 500;

const schema = z
  .object({ choice: z.string().min(1), text: z.string() })
  .superRefine((v, ctx) => {
    if (v.choice !== OTHER_CODE) return;
    const len = v.text.trim().length;
    if (len < OTHER_MIN || len > OTHER_MAX) {
      ctx.addIssue({ code: "custom", path: ["text"], message: `Enter ${OTHER_MIN}-${OTHER_MAX} characters.` });
    }
  });
type FormValues = z.infer<typeof schema>;

export type ReasonDialogProps = ReasonDialogConfig & {
  /** The element that opens the dialog (rendered as the trigger). */
  trigger: React.ReactElement;
  /**
   * Sends only `reason` to the API (label, or trimmed free text for Other).
   * `idempotencyKey` is stable for one open of the dialog so a retry after an
   * error or timeout reuses it and cannot create a second audit row.
   */
  onConfirm: (reason: string, idempotencyKey: string) => Promise<ActionResult<unknown>>;
};

export function ReasonDialog({
  title,
  note,
  presets,
  confirmLabel,
  tone,
  ownerVisible,
  trigger,
  onConfirm,
}: ReasonDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; requestId: string | null } | null>(null);
  const submitting = useRef(false);
  const idempotencyKey = useRef<string>("");
  const firstChip = useRef<HTMLButtonElement | null>(null);
  const handleStale = useActionErrorHandler();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { choice: "", text: "" },
  });
  const choice = useWatch({ control: form.control, name: "choice" });
  const isOther = choice === OTHER_CODE;

  function onOpenChange(next: boolean) {
    if (pending) return; // cannot close mid-request
    setOpen(next);
    if (next) {
      idempotencyKey.current = crypto.randomUUID(); // new key per open
    } else {
      form.reset();
      setError(null);
    }
  }

  async function submit(values: FormValues) {
    if (submitting.current) return; // blocks double-click before state flushes
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      const label = presets.find((p) => p.code === values.choice)?.label ?? values.choice;
      const reason = values.choice === OTHER_CODE ? values.text.trim() : label;
      const result = await onConfirm(reason, idempotencyKey.current);
      if (result.ok) {
        setPending(false);
        setOpen(false);
        form.reset();
        return;
      }
      if (handleStale(result.error)) {
        setPending(false);
        setOpen(false);
        return;
      }
      setError({ message: result.error.message, requestId: result.error.requestId });
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent showCloseButton={false} initialFocus={firstChip} className="sm:max-w-md">
        <form onSubmit={(e) => void form.handleSubmit(submit)(e)} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            <DialogDescription>{note}</DialogDescription>
          </DialogHeader>

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-semibold text-text">
              Reason <span className="font-normal text-muted-foreground">(required, saved to the audit log)</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {presets.map((p, i) => {
                const selected = choice === p.code;
                return (
                  <button
                    key={p.code}
                    ref={i === 0 ? firstChip : undefined}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => form.setValue("choice", p.code, { shouldValidate: true })}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-pill border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber",
                      selected
                        ? "border-danger bg-danger-bg font-semibold text-danger"
                        : "border-line-strong bg-surface text-text-2 hover:bg-soft",
                    )}
                  >
                    {selected && <Check aria-hidden className="size-3.5" />}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {isOther && (
            <div className="grid gap-1">
              <label htmlFor="reason-other" className="text-sm font-semibold text-text">
                Describe the reason
              </label>
              <Textarea
                id="reason-other"
                rows={3}
                maxLength={OTHER_MAX}
                aria-invalid={Boolean(form.formState.errors.text)}
                aria-describedby="reason-other-hint"
                {...form.register("text")}
              />
              <p id="reason-other-hint" className="text-xs text-muted-foreground">
                {OTHER_MIN}-{OTHER_MAX} characters.
              </p>
            </div>
          )}

          {ownerVisible && <p className="text-xs font-medium text-warning">The owner will see this.</p>}

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error.message}
              {error.requestId && <span className="block text-xs text-muted-foreground">Request ID {error.requestId}</span>}
            </p>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancel</DialogClose>
            <Button
              type="submit"
              disabled={!form.formState.isValid || pending}
              aria-busy={pending}
              className={cn(tone === "danger" && "bg-danger text-white hover:bg-danger/90")}
            >
              {pending ? "Working…" : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
