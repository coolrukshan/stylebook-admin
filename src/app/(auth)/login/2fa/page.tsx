import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/sb/auth-card";
import { TotpForm } from "@/features/auth/components/totp-form";
import { safeNextPath } from "@/lib/auth/idle";
import { getSession } from "@/lib/auth/session";

async function TwoFactor({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  const session = await getSession();
  if (!session.partialToken) redirect("/login");
  if (session.totpSetup) redirect(`/login/2fa/setup?next=${encodeURIComponent(next)}`);
  return (
    <AuthCard title="Two-factor authentication" description="Enter the 6-digit code from your authenticator app.">
      <TotpForm next={next} />
    </AuthCard>
  );
}

export default function TwoFactorPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense>
      <TwoFactor searchParams={searchParams} />
    </Suspense>
  );
}
