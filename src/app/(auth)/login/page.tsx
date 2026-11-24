import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/sb/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";
import { safeNextPath } from "@/lib/auth/idle";
import { isSessionActive } from "@/lib/auth/session";

async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  if (await isSessionActive()) redirect(next);
  return (
    <AuthCard title="Sign in" description="StyleBook staff only. You'll be asked for a 2FA code next.">
      <LoginForm next={next} />
    </AuthCard>
  );
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}
