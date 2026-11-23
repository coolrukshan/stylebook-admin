import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="grid min-h-[60vh] place-items-center p-8">
      <div className="max-w-sm text-center">
        <ShieldAlert aria-hidden className="mx-auto size-10 text-subtle" />
        <h1 className="mt-4 text-2xl font-semibold text-text">You don&apos;t have access to this area</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ask a super admin if you need this permission.</p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-amber underline-offset-4 hover:underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
