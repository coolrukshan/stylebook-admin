"use client";

import { useActionState, useRef, useState } from "react";
import { FormError } from "@/components/sb/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cancelPendingLogin, recoveryAction, verifyTotpAction } from "../actions";
import type { AuthFormState } from "../messages";

const initial: AuthFormState = {};

export function TotpForm({ next }: { next: string }) {
  const [useRecovery, setUseRecovery] = useState(false);
  return (
    <div className="space-y-4">
      {useRecovery ? <RecoveryForm next={next} /> : <CodeForm next={next} />}
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => setUseRecovery((v) => !v)}
          className="font-semibold text-amber underline-offset-4 hover:underline"
        >
          {useRecovery ? "Use authenticator code" : "Use a recovery code"}
        </button>
        <form action={cancelPendingLogin}>
          <input type="hidden" name="next" value={next} />
          <button type="submit" className="text-muted-foreground underline-offset-4 hover:underline">
            Back to sign in
          </button>
        </form>
      </div>
    </div>
  );
}

function CodeForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(verifyTotpAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <label htmlFor="code" className="text-sm font-medium text-text">6-digit code</label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          autoFocus
          required
          className="h-11 font-mono text-lg tracking-[0.4em]"
          aria-invalid={Boolean(state.error)}
          onChange={(e) => {
            const digits = e.currentTarget.value.replace(/\D/g, "").slice(0, 6);
            e.currentTarget.value = digits;
            if (digits.length === 6) formRef.current?.requestSubmit();
          }}
        />
      </div>
      <FormError message={state.error} requestId={state.requestId} />
      <Button type="submit" className="h-11 w-full" disabled={pending || state.locked} aria-busy={pending}>
        {pending ? "Verifying…" : "Verify"}
      </Button>
    </form>
  );
}

function RecoveryForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(recoveryAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <label htmlFor="recovery" className="text-sm font-medium text-text">Recovery code</label>
        <Input id="recovery" name="code" autoComplete="off" autoFocus required className="h-11 font-mono" aria-invalid={Boolean(state.error)} />
      </div>
      <FormError message={state.error} requestId={state.requestId} />
      <Button type="submit" className="h-11 w-full" disabled={pending || state.locked} aria-busy={pending}>
        {pending ? "Verifying…" : "Use recovery code"}
      </Button>
    </form>
  );
}
