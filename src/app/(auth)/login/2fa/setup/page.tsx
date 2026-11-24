import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/sb/auth-card";
import { TotpSetup } from "@/features/auth/components/totp-setup";
import { safeNextPath } from "@/lib/auth/idle";
import { getSession, isSessionActive } from "@/lib/auth/session";

async function Setup({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  const session = await getSession();
  const active = await isSessionActive();
  // After a successful confirm the session turns active and the secret is gone;
  // the client keeps showing the recovery codes it already holds.
  if (!active && (!session.partialToken || !session.totpSetup)) redirect("/login");
  return (
    <AuthCard title="Set up two-factor authentication" description="Your account needs 2FA before you can use the console. Scan the code with an authenticator app.">
      <TotpSetup uri={session.totpSetup?.uri ?? ""} secret={session.totpSetup?.secret ?? ""} next={next} />
    </AuthCard>
  );
}

export default function SetupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense>
      <Setup searchParams={searchParams} />
    </Suspense>
  );
}
