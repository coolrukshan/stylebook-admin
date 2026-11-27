"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Fetches the export so errors show as a toast instead of replacing the page. */
export function ExportButton({ query, disabled }: { query: string; disabled?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function download() {
    setPending(true);
    try {
      const res = await fetch(`/api/export/audit?${query}`, { cache: "no-store" });
      if (res.status === 401) return router.push("/login");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        toast.error(body?.message ?? "Couldn't export the audit log. Try again.");
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "audit_log.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't export the audit log. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="outline" disabled={disabled || pending} aria-busy={pending} onClick={() => void download()}>
      {pending ? "Exporting…" : "Export CSV"}
    </Button>
  );
}
