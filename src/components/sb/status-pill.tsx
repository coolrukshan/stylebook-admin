import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PillVariant = "success" | "warning" | "danger" | "info";

const VARIANTS: Record<PillVariant, { cls: string; Icon: LucideIcon }> = {
  success: { cls: "bg-success-bg text-success", Icon: CheckCircle2 },
  warning: { cls: "bg-warning-bg text-warning", Icon: AlertTriangle },
  danger: { cls: "bg-danger-bg text-danger", Icon: XCircle },
  info: { cls: "bg-info-bg text-info", Icon: Info },
};

/**
 * Single mapping from API status strings to pill variant and label.
 * Keys are lower-case API values; unknown statuses fall back to info with the
 * raw string so nothing is hidden.
 */
export const STATUS_MAP: Record<string, { variant: PillVariant; label: string }> = {
  active: { variant: "success", label: "Active" },
  verified: { variant: "success", label: "Verified" },
  approved: { variant: "success", label: "Approved" },
  received: { variant: "success", label: "Received" },
  resolved: { variant: "success", label: "Resolved" },
  pending: { variant: "warning", label: "Pending" },
  pending_verification: { variant: "warning", label: "Pending verification" },
  salon_review: { variant: "warning", label: "Salon has 48 h" },
  suspended: { variant: "danger", label: "Suspended" },
  rejected: { variant: "danger", label: "Rejected" },
  admin_review: { variant: "danger", label: "Needs decision" },
  missing: { variant: "danger", label: "Missing" },
  open: { variant: "info", label: "Open" },
  in_review: { variant: "info", label: "In review" },
  info_requested: { variant: "info", label: "Info requested" },
};

export function resolveStatus(status: string): { variant: PillVariant; label: string } {
  return STATUS_MAP[status.toLowerCase()] ?? { variant: "info", label: status.replace(/_/g, " ") };
}

/** Always icon + text; colour is never the only signal. */
export function StatusPill({
  status,
  variant,
  label,
  className,
}: {
  status?: string;
  variant?: PillVariant;
  label?: string;
} & { className?: string }) {
  const mapped = status ? resolveStatus(status) : undefined;
  const v = variant ?? mapped?.variant ?? "info";
  const text = label ?? mapped?.label ?? "";
  const { cls, Icon } = VARIANTS[v];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold", cls, className)}>
      <Icon aria-hidden className="size-3.5" />
      {text}
    </span>
  );
}
