import { Scissors } from "lucide-react";

/** Centered card on the cream background for sign-in, 2FA and lock screens. */
export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-sm rounded-card bg-surface p-8 shadow-card">
        <div className="mb-6 flex items-center gap-2 text-text">
          <Scissors aria-hidden className="size-5" />
          <span className="font-semibold">StyleBook Admin</span>
        </div>
        <h1 className="text-xl font-bold text-text">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

/** aria-live region for form errors; always rendered so announcements work. */
export function FormError({ message, requestId }: { message?: string; requestId?: string | null }) {
  return (
    <div aria-live="polite" className="min-h-5">
      {message && (
        <p role="alert" className="text-sm font-medium text-danger">
          {message}
          {requestId && <span className="ml-1 font-mono text-xs text-muted-foreground">({requestId})</span>}
        </p>
      )}
    </div>
  );
}
