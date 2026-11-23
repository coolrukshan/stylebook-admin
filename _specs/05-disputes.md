# A-08 Disputes and refunds

Mockups: `A-08_disputes_and_refunds.png`, `A-14_reason_reject_dispute.png`.

**Purpose:** decide client disputes that the salon did not solve in 48 hours, or that the client escalated.
**Roles:** Super admin, Support, Finance (`dispute.decide`). Moderator: no access.
**Stories:** US-A-14, US-A-15. SRS: ADM-10, ADM-20, BR-08, BR-09.
**Routes:** `/disputes`, `/disputes/[id]` (the detail page has no mockup).

## List content

Title "Disputes and refunds", subtitle "Escalated after 48 hours or by the client". Intro text: "Clients raise a problem from the receipt. The salon has 48 hours to answer; after that, or if the client escalates, it lands here. Refunds go back to the original payment method."

| Column | Content |
|---|---|
| Case | `DSP-118` and "Opened 3 days ago" |
| Client · salon | "Tharindu J." / "RedBox Barber" (client name shortened) |
| Issue | Client's problem, up to 3 lines |
| Amount | `LKR 1,000` |
| Salon reply | "No reply after 48 h", the salon's quote ("We will refund but need the item back"), or "Waiting" |
| Status | `Needs decision` (red), `Salon has 48 h` (amber) |
| Decision | **Full refund** (green), **50%** (secondary), **Reject** (red outline) |

Below the table, three stat cards: **Refunds this week** (LKR 41,200, "Deducted from salon payouts"), **Solved by salons in 48 h** (81%, "Only 19% reach admins"), **Chargebacks** (0, "Last 30 days").

## Acceptance criteria

**Which disputes appear**
- Escalated disputes (salon did not reply in 48 h, or client escalated) have status Needs decision.
- A dispute still in the salon's 48-hour window (DSP-119, "Salon has 48 h") is shown in the mockup **with decision buttons**. The user story (US-A-14) says only escalated disputes. Assumption: a dispute within the window is visible but its decision buttons are disabled with "Salon has 46 h left", unless the client escalated. **Open question 1.**
- Order: Needs decision first, oldest first.

**Full refund**
- Given a dispute needing a decision, when I click Full refund, then the API refunds the full disputed amount to the original payment method. The salon's next payout is reduced by that amount (A-06 "Refunds"). The status becomes Resolved · Full refund. Both parties are notified.
- The console never computes the amount. It sends no amount, only the decision. The API uses the dispute's amount.

**50%**
- Same as Full refund, but the API refunds 50% of the amount. The resulting figure (for example LKR 1,200 of LKR 2,400) should be shown in the confirmation text from an API preview. The console does not do the arithmetic.

**Reject**
- Given I click Reject, then ReasonDialog opens ("Reject dispute DSP-118?", note "The client is told why and keeps the right to contact their bank.", red confirm "Reject dispute").
- Presets: Service delivered as booked · Policy accepted at booking · Not enough evidence · Other.
- Given I confirm, then the dispute is closed as rejected, the client is told the reason, and audit `dispute.rejected` is written with the reason.

**Reason for refunds (conflict)**
- The mockup has no dialog for Full refund or 50%. The rule says every write except a pure approval sends a reason. A refund is a money decision and not a pure approval. Assumption: both open a confirm dialog with an API-provided summary ("Refund LKR 2,400 to the client's card; deducted from {salon}'s next payout") plus a **required** reason (presets are an open question). **Open question 2.**

**Salon reply**
- "No reply after 48 h", "Waiting" and quoted replies are API fields. A long reply is truncated with a "Read more" that opens the dispute detail.

**Stats**
- All three stat cards are API values for the current week and the last 30 days. No client-side calculation.

## Dispute detail `/disputes/[id]` (no mockup; from US-A-14)
Shows both sides' messages in order (client message, salon reply), the booking or order reference (BK-/SB-), amount, receipt, attachments, timeline, and the same three decisions. The detail page is where the decision is usually made after reading the messages. The list buttons are a shortcut.

## Business rules
- Refunds return to the original payment method and are deducted from the salon's next payout (BR-08, BR-09).
- A decided dispute cannot be changed from the console (assumption). A second admin acting at the same time gets a 409.
- Client personal data on this page: names shortened ("Tharindu J.") and no contact data. Nothing to mask.
- Idempotency: a double click on a refund must not refund twice (`Idempotency-Key` per action).

## Screen states
| State | Behaviour |
|---|---|
| Loading | Row and stat skeletons |
| Empty | "No disputes need a decision" with the stat cards still shown |
| Error | Inline retry. A refund call that times out shows "Checking the result…" and re-reads the dispute before allowing a retry |
| Forbidden | 403 for Moderator |
| Partial | Stats fail, table loads (or the opposite) |

## API (proposed)
- `GET /v1/admin/disputes?status=&page=&sort=` → `[{ id, code: "DSP-118", opened_at, client{ display_name }, salon{ id, name }, issue, amount_cents, salon_reply{ state: none_after_48h|replied|waiting, text? }, status: needs_decision|salon_window, salon_window_ends_at? }]`
- `GET /v1/admin/disputes/stats` → `{ refunds_week_cents, solved_by_salon_48h_rate, chargebacks_30d }`
- `GET /v1/admin/disputes/{id}` (messages, attachments, booking ref)
- `GET /v1/admin/disputes/{id}/refund-preview?type=full|half` → `{ refund_cents, deducted_from_salon_cents }`
- `POST /v1/admin/disputes/{id}/decision` body `{ decision: full_refund|half_refund|reject, reason_code, reason_text }`

## Open questions
1. Can admins decide a dispute that is still inside the salon's 48-hour window?
2. Do Full refund and 50% need a reason (assumed yes), and what are the presets (for example "Service not as described", "Salon did not respond")?
3. Is 50% the only partial option, or should there be a custom amount?
4. What is the status list (Resolved · Full / Half / Rejected / Chargeback)?
5. When the salon says "We will refund but need the item back" (DSP-117), what is the flow for returning the item? Does the admin need a "needs return" outcome?
6. May Finance decide disputes? (The matrix says yes.)
