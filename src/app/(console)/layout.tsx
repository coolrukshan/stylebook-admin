import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sb/sidebar";
import { getCurrentAdmin } from "@/lib/auth/current-admin";

async function Shell({ children }: { children: React.ReactNode }) {
  const me = await getCurrentAdmin();
  if (!me) redirect("/login");
  return (
    <div className="hidden min-h-screen min-[1024px]:flex">
      <Sidebar me={me} />
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="grid min-h-screen place-items-center p-8 text-center min-[1024px]:hidden">
        <p className="max-w-xs text-text-2">
          The admin console needs a larger screen. Open it on a display at least 1024px wide.
        </p>
      </div>
      <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
        <Shell>{children}</Shell>
      </Suspense>
    </>
  );
}
