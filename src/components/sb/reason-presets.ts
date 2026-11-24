export type ReasonPreset = { code: string; label: string };

export type ReasonDialogConfig = {
  title: string;
  note: string;
  presets: ReasonPreset[];
  confirmLabel: string;
  tone: "danger" | "neutral";
  /** Reason is emailed to / shown to the salon owner. */
  ownerVisible?: boolean;
};

export const OTHER_CODE = "other";
const OTHER: ReasonPreset = { code: OTHER_CODE, label: "Other" };

/**
 * The five dialogs from spec 00 section 5 (A-14). Labels are owner-safe where
 * the owner sees them. `code` is only a stable UI key: the API has no
 * `reason_code`, so only the label (or free text for Other) is sent.
 */
export const reasonDialogs = {
  rejectSalon: (salon: string): ReasonDialogConfig => ({
    title: `Reject ${salon}?`,
    note: "The owner is emailed the reason and can apply again after 30 days.",
    presets: [
      { code: "documents_invalid", label: "Documents invalid" },
      { code: "duplicate_account", label: "Duplicate account" },
      { code: "not_a_salon", label: "Not a salon business" },
      OTHER,
    ],
    confirmLabel: "Reject application",
    tone: "danger",
    ownerVisible: true,
  }),
  requestInfo: (salon: string): ReasonDialogConfig => ({
    title: `Request info from ${salon}`,
    note: "The owner gets an email and an in-app task. The application stays paused until they reply.",
    presets: [
      { code: "proof_of_address_missing", label: "Proof of address missing" },
      { code: "photos_unclear", label: "Photos unclear" },
      { code: "business_name_mismatch", label: "Business name mismatch" },
      OTHER,
    ],
    confirmLabel: "Send request",
    tone: "neutral",
    ownerVisible: true,
  }),
  rejectPayoutAccount: (salon: string): ReasonDialogConfig => ({
    title: `Reject payout account · ${salon}`,
    note: "Payouts stay on hold and the salon is asked to add a new account.",
    presets: [
      { code: "name_mismatch", label: "Name does not match business" },
      { code: "letter_unreadable", label: "Bank letter unreadable" },
      { code: "suspected_fraud", label: "Suspected fraud" },
      OTHER,
    ],
    confirmLabel: "Reject account",
    tone: "danger",
  }),
  /** ASSUMPTION (spec 05, open question 2): a full refund also asks for a reason. */
  refundDispute: (disputeId: string): ReasonDialogConfig => ({
    title: `Full refund for dispute ${disputeId}?`,
    note: "The full disputed amount is refunded to the client's original payment method and deducted from the salon's next payout.",
    presets: [
      { code: "not_as_described", label: "Service not as described" },
      { code: "salon_no_response", label: "Salon did not respond" },
      { code: "booking_not_honoured", label: "Booking not honoured" },
      OTHER,
    ],
    confirmLabel: "Refund in full",
    tone: "neutral",
  }),
  rejectDispute: (disputeId: string): ReasonDialogConfig => ({
    title: `Reject dispute ${disputeId}?`,
    note: "The client is told why and keeps the right to contact their bank.",
    presets: [
      { code: "service_delivered", label: "Service delivered as booked" },
      { code: "policy_accepted", label: "Policy accepted at booking" },
      { code: "not_enough_evidence", label: "Not enough evidence" },
      OTHER,
    ],
    confirmLabel: "Reject dispute",
    tone: "danger",
  }),
  suspendUser: (name: string): ReasonDialogConfig => ({
    title: `Suspend ${name}?`,
    note: "They are signed out, cannot book or post reviews, and upcoming bookings are cancelled with a full refund.",
    presets: [
      { code: "spam_or_fake_reviews", label: "Spam or fake reviews" },
      { code: "abusive_to_staff", label: "Abusive to staff" },
      { code: "payment_fraud", label: "Payment fraud" },
      { code: "repeated_no_shows", label: "Repeated no-shows" },
      OTHER,
    ],
    confirmLabel: "Suspend user",
    tone: "danger",
  }),
  /** ASSUMPTION (open question in spec 04): reactivate also asks for a reason. */
  reactivateUser: (name: string): ReasonDialogConfig => ({
    title: `Reactivate ${name}?`,
    note: "They can sign in, book and post reviews again.",
    presets: [
      { code: "suspended_in_error", label: "Suspended in error" },
      { code: "issue_resolved", label: "Issue resolved" },
      { code: "appeal_accepted", label: "Appeal accepted" },
      OTHER,
    ],
    confirmLabel: "Reactivate user",
    tone: "neutral",
  }),
} as const;
