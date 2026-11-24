import { Suspense } from "react";
import { AuthCard } from "@/components/sb/auth-card";
import { Button } from "@/components/ui/button";
import { signOutAndReturn } from "@/lib/auth/actions";
import { safeNextPath } from "@/lib/auth/idle";
import { getSession } from "@/lib/auth/session";

async function LockCard({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const session = await getSession();
  return (
    <AuthCard
      title="Session locked"
      description="Your session was locked after 30 minutes of inactivity. Sign in again to continue."
    >
      {session.adminName && (
        <p className="mb-4 text-sm text-text">
          Signed in as <span className="font-semibold">{session.adminName}</span>
        </p>
      )}
      <form action={signOutAndReturn}>
        <input type="hidden" name="next" value={safeNextPath(next)} />
        <Button type="submit" className="h-11 w-full">Sign in again</Button>
      </form>
    </AuthCard>
  );
}

export default function LockPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense>
      <LockCard searchParams={searchParams} />
    </Suspense>
  );
}
