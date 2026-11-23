# 00 Shared: shell, roles, formats, states, ReasonDialog, audit

## 1. App shell (all console screens)

From the mockups:
- **Sidebar** (dark, 220px). Logo and "Admin console". Items, in order: Dashboard, Salon applications, Payout accounts, Users, Disputes and refunds, Fees and commission, Re-engagement, Admin roles, Audit log. The active item has a highlight. Count badges (amber) appear on Salon applications (3), Payout accounts (3) and Disputes and refunds (3).
- **Sidebar footer**: admin name, "Super admin · 2FA on · session locks after 30 min idle". It shows the role of whoever is signed in.
- **Top bar**: page title and subtitle on the left. The environment badge ("DEMO DATA" / "STAGING"; none in prod) and the global search box ("Search users, salons, bookings, orders") on the right.
- Items for A-11, A-15–A-19 are not in the mockup sidebar. Reports, Moderation, Tickets, Catalogue and Announcements need nav entries (assumption: appended after Re-engagement, role-gated).
- Sidebar items are hidden if the role lacks the permission (US-A-04a). Badges come from one API call (`GET /v1/admin/counts`, proposed) and refresh via SSE.

## 2. Roles and permissions

Roles: Super admin, Support, Finance, Moderator. The matrix is stored by the API and edited in A-12. The table below is the **default** from the A-12 mockup (✓ = allowed). Rows marked * are not in the mockup and are **assumptions**.

| Permission key (proposed) | Super admin | Support | Finance | Moderator |
|---|---|---|---|---|
| `salon_application.approve` (also request info / reject*) | ✓ | ✓ | – | – |
| `user.suspend` (and reactivate*) | ✓ | ✓ | – | ✓ |
| `bank_account.reveal` | ✓ | – | ✓ | – |
| `payout_account.verify`* (verify / reject) | ✓ | – | ✓ | – |
| `payout_run.approve` (and export bank file*) | ✓ | – | ✓ | – |
| `dispute.decide` | ✓ | ✓ | ✓ | – |
| `fees.change` | ✓ | – | ✓ | – |
| `moderation.act` | ✓ | ✓ | – | ✓ |
| `admin.manage` (roles, admins) | ✓ | – | – | – |
| `audit.view`* | ✓ | ✓ | ✓ | ✓ |
| `engagement.edit`* | ✓ | – | – | – |
| `dashboard.view`, `users.view`, `disputes.view`, `salons.view`* | ✓ | ✓ | ✓ | scoped |

Rules:
- Enforced in three places: sidebar and buttons (UI), `requireRole()` in each page and Server Action, and the API. The UI check is for convenience only.
- Forbidden state: a user who opens a route without permission sees a 403 page ("You don't have access to this area"). No data is fetched.
- Super admin is locked to all permissions in A-12 and cannot be edited.
- Read access vs action access are separate. A role without the action permission sees the page read-only, with no buttons rendered (not disabled).

## 3. Formats

| Item | Rule | Example |
|---|---|---|
| Money | Integer cents from the API, formatted `LKR 1,500`. Large KPIs use compact `LKR 8.9M`, `LKR 714k` (display only). | `LKR 8,165,568` |
| Dates | Asia/Colombo, "Thu 29 Oct, 9:30 AM". Month and year only for "Joined" ("Feb 2026"). Relative ages ("Opened 3 days ago") come from the API timestamp. | |
| Audit times | Always show the time zone (see README conflict 5). | |
| Percent | Whole numbers unless the API sends decimals (`0.6%`, `4.1% no-show`). | |
| IDs | `BK-20931` booking, `SB-1046` order, `DSP-118` dispute. Mono font for IPs and account numbers. | |
| Status pills | Success (Active, Verified, Received), warning (Pending verification, Salon has 48 h), danger (Suspended, Needs decision, Missing), info (In review). Always text plus colour. | |

The console never computes fees, refunds, commission or totals. It only formats values the API returns.

## 4. Screen states (every screen)

| State | Behaviour |
|---|---|
| Loading | Server Component streams a skeleton (cards or table rows). Mutations show a pending button and block double-submit. |
| Empty | Friendly line with the reason ("No applications to review"). Filters empty: show "No results" and a clear-filters link. |
| Error | Inline error card with retry and the `X-Request-Id`. Never show raw API messages that contain PII. |
| Forbidden | 403 page (see roles). Action 403 shows a toast and refreshes the page. |
| Partial data | Each card or section loads and fails independently (for example dashboard KPI cards). A failed section shows "Couldn't load" and retry. |
| Stale | A 409 on a write means another admin acted first. Show "This was already handled by <admin>" and refresh. |
| Idle lock | After 30 min idle the middleware redirects to `/lock`. A TOTP code unlocks it and restores the previous URL. |

## 5. ReasonDialog (A-14)

Radix Dialog with: title (question with subject name or ID), consequence note, "Reason (required, saved to the audit log)", preset chips (single select), Cancel, and a red confirm button. The confirm is disabled (faded) until a reason is chosen.

| Dialog | Title | Consequence note | Presets | Confirm |
|---|---|---|---|---|
| Reject salon | Reject {salon}? | The owner is emailed the reason and can apply again after 30 days. | Documents invalid · Duplicate account · Not a salon business · Other | Reject application |
| Request info | Request info from {salon} | The owner gets an email and an in-app task. The application stays paused until they reply. | Proof of address missing · Photos unclear · Business name mismatch · Other | Send request |
| Reject payout account | Reject payout account · {salon} | Payouts stay on hold and the salon is asked to add a new account. | Name does not match business · Bank letter unreadable · Suspected fraud · Other | Reject account |
| Reject dispute | Reject dispute {DSP-id}? | The client is told why and keeps the right to contact their bank. | Service delivered as booked · Policy accepted at booking · Not enough evidence · Other | Reject dispute |
| Suspend user | Suspend {name}? | They are signed out, cannot book or post reviews, and upcoming bookings are cancelled with a full refund. | Spam or fake reviews · Abusive to staff · Payment fraud · Repeated no-shows · Other | Suspend user |

Rules:
- **Other** reveals a required free-text field (min 10 chars, max 500). Assumption: the mockup shows no text field, but "Other" would be meaningless without one.
- For presets, the API receives `reason_code` (stable key) and `reason_text` (the label, or the free text for Other).
- Request info and Reject reasons are **seen by the salon owner**. Preset labels must therefore be owner-safe wording. Free text on those two is shown to the owner. Add a hint "The owner will see this".
- Esc and Cancel close the dialog and send nothing. Focus is trapped, returns to the trigger on close, and the first chip is focused on open.
- In the mockup, a chip is highlighted in red once chosen. Selection must not rely on colour alone (add a check icon and `aria-pressed`).
- The same component is reused for any new reasoned action (suspend salon, hide review, and so on) by passing title, note, presets and confirm label.
- Reactivate user: a reason is not shown in any mockup. Assumption: it opens ReasonDialog (non-red confirm) because it is a state change on a person. See open questions in 04.

## 6. PII rules

- Phone and email are partially masked everywhere (lists, search results, detail). Account numbers are fully masked except the last 4 digits (`•••• •••• 4821`).
- Reveal is an audited API call, never a client-side unmask. The revealed value is held in component state only. It is never put in the URL, cache, logs or Sentry. It auto-hides on "Hide", on navigation, and after 60 s (assumption).
- Search queries may contain PII. Do not log them.

## 7. Audit events (written by the API; the console must send the reason)

| Event | Reason sent |
|---|---|
| `salon_application.approved` | no |
| `salon_application.info_requested` / `.rejected` | yes |
| `bank_account.revealed` | no (reveal itself is the audit entry) |
| `payout_account.verified` | no |
| `payout_account.rejected` | yes |
| `payout_run.approved`, `payout_run.exported` | no |
| `user.suspended` | yes |
| `user.reactivated` | yes (assumption) |
| `dispute.refunded_full` / `.refunded_half` / `.rejected` | rejected: yes; refunds: assumption yes |
| `fees.updated` | assumption yes |
| `role.permission_changed` | assumption yes |
| `pii.revealed` (email or phone) | no |

Every write also sends `Idempotency-Key` and `X-Request-Id`. A retry after a timeout must not create a second audit row.

## 8. Accessibility baseline

Full keyboard use for tables, dialogs and the command palette. Visible focus ring. Icon-only buttons have labels. Row actions have an accessible name that includes the subject ("Reveal account number for RedBox Barber"), because the mockups repeat "Reveal / Verify / Reject" on every row. Axe passes in e2e.
