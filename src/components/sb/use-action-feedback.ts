"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionError } from "@/lib/api/errors";

/**
 * Standard handling of a failed Server Action result.
 *  - 409 stale: "already handled by another admin" toast + refresh
 *  - 403: toast + refresh (the page re-renders without the action)
 *  - 401: back to sign-in
 * Returns true when fully handled here. Otherwise (422, 5xx, network) the
 * caller shows `error.message` inline, with `error.requestId`.
 */
export function useActionErrorHandler() {
  const router = useRouter();
  return (error: ActionError): boolean => {
    if (error.status === 409 || error.status === 403) {
      toast.error(error.message);
      router.refresh();
      return true;
    }
    if (error.status === 401) {
      router.push("/login");
      return true;
    }
    return false;
  };
}
