import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center p-8">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-semibold text-text">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">That page or record doesn&apos;t exist.</p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-amber underline-offset-4 hover:underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
