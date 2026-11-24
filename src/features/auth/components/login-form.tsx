"use client";

import { useActionState } from "react";
import { FormError } from "@/components/sb/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction } from "../actions";
import type { AuthFormState } from "../messages";

const initial: AuthFormState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-text">Email</label>
        <Input id="email" name="email" type="email" autoComplete="username" autoFocus required className="h-11" aria-invalid={Boolean(state.error)} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-text">Password</label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-11" aria-invalid={Boolean(state.error)} />
      </div>
      <FormError message={state.error} requestId={state.requestId} />
      <Button type="submit" className="h-11 w-full" disabled={pending || state.locked} aria-busy={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
