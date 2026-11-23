import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { signOutAndReturn } from "@/lib/auth/actions";
import { safeNextPath } from "@/lib/auth/idle";

async function LockCard({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <form action={signOutAndReturn} className="w-full max-w-sm rounded-card bg-surface p-8 shadow-card">
      <input type="hidden" name="next" value={safeNextPath(next)} />
      <h1 className="text-xl font-bold text-text">Session locked</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You were signed out after 30 minutes of inactivity. Sign in again to continue where you left off.
      </p>
      <Button type="submit" className="mt-6 w-full">
        Sign in again
      </Button>
    </form>
  );
}

// Stub. The real A-01 lock screen is built in spec 01.
export default function LockPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <Suspense>
        <LockCard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
