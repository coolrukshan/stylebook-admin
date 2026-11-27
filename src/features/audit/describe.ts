import { roleLabel } from "@/lib/auth/permissions";

const ACTIONS: Record<string, string> = {
  "application.approve": "Approved salon application",
  "application.request_info": "Asked for more information on salon application",
  "application.reject": "Rejected salon application",
  "user.suspend": "Suspended user",
  "user.reactivate": "Reactivated user",
  "partner_account.created": "Created partner account",
  "partner_account.password_reset": "Reset partner password",
  "partner_account.disabled": "Disabled partner account",
  "partner_account.enabled": "Enabled partner account",
  "partner_account.phone_changed": "Changed partner phone number",
  "salon.suspend": "Suspended salon",
  "salon.reactivate": "Reactivated salon",
  "salon.close": "Closed salon",
  "salon.feature": "Featured salon",
  "salon.unfeature": "Removed salon from featured",
  "salon.impersonate": "Viewed the app as salon",
  "payout_account.reveal": "Revealed bank account",
  "payout_account.verify": "Verified payout account",
  "payout_account.reject": "Rejected payout account",
  "payout_run.create": "Created payout run",
  "dispute.decide": "Decided dispute",
  "dispute.respond": "Salon responded to dispute",
  "dispute.escalate": "Escalated dispute",
  "fees.update": "Changed platform fees",
  "fees.override": "Set salon fee override",
  "fees.override.delete": "Removed salon fee override",
  "moderation.approve": "Approved moderated content",
  "moderation.remove": "Removed moderated content",
  "moderation.escalate": "Escalated moderated content",
  "engagement.holdout_reset": "Reset holdout group",
  "ticket.create": "Created ticket",
  "ticket.assign": "Assigned ticket",
  "ticket.start": "Started ticket",
  "ticket.resolve": "Resolved ticket",
  "ticket.close": "Closed ticket",
  "ticket.reopen": "Reopened ticket",
  "catalogue.create": "Added catalogue item",
  "catalogue.update": "Updated catalogue item",
  "catalogue.deactivate": "Deactivated catalogue item",
  "setting.update": "Changed platform setting",
  "announcement.create": "Created announcement",
  "announcement.update": "Updated announcement",
  "announcement.deactivate": "Deactivated announcement",
  "admin_user.create": "Created admin",
  "admin_user.update": "Updated admin",
  "admin_user.totp_reset": "Reset admin 2FA",
};

/** Unknown actions are shown exactly as the API names them, never hidden. */
export const describeAction = (action: string) => ACTIONS[action] ?? action;

export const shortId = (id: string) => id.slice(0, 8);

const SUBJECT_PAGES: Record<string, string> = {
  user: "/users",
  dispute: "/disputes",
  payout_run: "/payouts/runs",
  salon_application: "/applications",
};

/** The API sends no subject names, only a type and an id. */
export function subject(type: string, id: string): { label: string; href: string | null } {
  const base = SUBJECT_PAGES[type];
  return {
    label: `${type.replace(/_/g, " ")} ${shortId(id)}`,
    href: base ? `${base}/${encodeURIComponent(id)}` : null,
  };
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Ayesha (Super admin)", or "Support · 1a2b3c4d" when no name is available. */
export function actorLabel(role: string, id: string, names: ReadonlyMap<string, string>): string {
  if (role === "system") return "System";
  const label = capitalise(roleLabel(role));
  const name = names.get(id)?.trim().split(/\s+/)[0];
  return name ? `${name} (${label})` : `${label} · ${shortId(id)}`;
}
