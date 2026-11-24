"use client";

import { useActionState, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FormError } from "@/components/sb/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cancelPendingLogin, continueAfterSetup, setupTotpAction, type SetupState } from "../actions";

const initial: SetupState = {};

/** `uri`/`secret` come from the sealed session on the server; never put in URL or storage. */
export function TotpSetup({ uri, secret, next }: { uri: string; secret: string; next: string }) {
  const [state, action, pending] = useActionState(setupTotpAction, initial);
  if (state.recoveryCodes) return <RecoveryCodes codes={state.recoveryCodes} next={next} />;
  if (!uri) {
    // Already enrolled (page reloaded after confirm); nothing left to show.
    return (
      <form action={continueAfterSetup}>
        <input type="hidden" name="next" value={next} />
        <Button type="submit" className="h-11 w-full">Continue</Button>
      </form>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-center rounded-input border border-line bg-white p-3">
        <QRCodeSVG value={uri} size={168} role="img" aria-label="QR code for your authenticator app" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Can&apos;t scan? Enter this key manually</p>
        <p className="mt-1 break-all rounded-input bg-soft px-3 py-2 font-mono text-sm text-text">{secret}</p>
      </div>
      <form action={action} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="code" className="text-sm font-medium text-text">6-digit code from the app</label>
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required className="h-11 font-mono text-lg tracking-[0.4em]" aria-invalid={Boolean(state.error)} />
        </div>
        <FormError message={state.error} requestId={state.requestId} />
        <Button type="submit" className="h-11 w-full" disabled={pending || state.locked} aria-busy={pending}>
          {pending ? "Verifying…" : "Turn on 2FA"}
        </Button>
      </form>
      <form action={cancelPendingLogin} className="text-center">
        <input type="hidden" name="next" value={next} />
        <button type="submit" className="text-sm text-muted-foreground underline-offset-4 hover:underline">Back to sign in</button>
      </form>
    </div>
  );
}

function RecoveryCodes({ codes, next }: { codes: string[]; next: string }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Save these recovery codes somewhere safe. Each works once if you lose your phone. They won&apos;t be shown again.
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-input bg-soft p-3 font-mono text-sm text-text">
        {codes.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(codes.join("\n"));
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Copied" : "Copy codes"}
      </Button>
      <label className="flex items-center gap-2 text-sm text-text">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="size-4 accent-amber" />
        I have saved these codes
      </label>
      <form action={continueAfterSetup}>
        <input type="hidden" name="next" value={next} />
        <Button type="submit" className="h-11 w-full" disabled={!saved}>Continue</Button>
      </form>
    </div>
  );
}
