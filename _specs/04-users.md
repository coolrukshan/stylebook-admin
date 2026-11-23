# A-07 Users

Mockups: `A-07_users.png`, `A-14_reason_suspend_user.png`.

**Purpose:** find a client or partner staff member, review their activity and flags, suspend or reactivate them.
**Roles:** view: Super admin, Support, Moderator (assumption). Suspend / reactivate: Super admin, Support, Moderator (`user.suspend`). Finance: no access (assumption).
**Stories:** US-A-12, US-A-13. SRS: ADM-04, ADM-19.
**Routes:** `/users`, `/users/[id]`. The mockup shows only the list. The detail page is a gap (see below).

## List content

Title "Users", subtitle "Clients and partner staff". A "Find user" input ("Name, email or phone") and a result count ("8 shown").

| Column | Content |
|---|---|
| Name | Bold name. An optional red flag line, for example "6 reports · suspected spam reviews" |
| Email · phone | Two lines (masked, see rules) |
| Type | `Client`, `Partner · RedBox Barber (specialist)`, `Partner · Glow Studio (owner)` |
| Bookings | Count (0, 14, 312) |
| Joined | "Feb 2026" (month and year) |
| Status | `Active` (green) or `Suspended` (red) |
| Action | Active rows: **Suspend**. Suspended rows: **Reactivate**. |

## Acceptance criteria

**Find a user**
- Given I type in Find user, when I pause for 300 ms (or press Enter), then the list filters server-side by name, email or phone. The query goes to the URL (`?q=`) so the link is shareable.
- Given a phone search, then `077 123 4567`, `+94 77 123 4567` and `94771234567` find the same user (the API normalises numbers).
- Given an email search, the match is case-insensitive and partial.
- "N shown" is the number of rows in the current result, with the total from the API ("8 of 1,240" when more exist). The mockup says "8 shown"; there must be paging.
- Given no matches, show "No users match "{q}"".
- Filters (assumption, not in the mockup): type (Client / Partner), status. Sort by joined date (default newest first).

**Suspend**
- Given an active user and I have `user.suspend`, when I click Suspend, then ReasonDialog opens ("Suspend {name}?", red confirm "Suspend user").
- Consequence note: "They are signed out, cannot book or post reviews, and upcoming bookings are cancelled with a full refund."
- Presets: Spam or fake reviews · Abusive to staff · Payment fraud · Repeated no-shows · Other.
- Given I confirm, then the API suspends the user, signs them out, cancels upcoming bookings with a full refund, and writes `user.suspended` with the reason. The row shows Suspended and the action becomes Reactivate. A toast confirms.
- Given the user has upcoming bookings, the API handles cancellations and refunds. The console shows the number cancelled in the toast if the API returns it.
- Suspending a **Partner** (owner or specialist) has different consequences (a salon's bookings, payouts). The mockup uses one note for all. **Open question.**
- An admin cannot suspend themselves or another admin from this screen (admins are managed in A-12, assumption).

**Reactivate**
- Given a suspended user, when I click Reactivate, then the account is restored. The reason is requested (see open question 2). Audit `user.reactivated`. Bookings cancelled at suspension are **not** restored.

**Flags**
- The red flag line ("6 reports · suspected spam reviews") is API data (report count and category). It links to the user's reports on `/users/[id]` (and to moderation, A-11).

## User detail `/users/[id]` (no mockup; derived from US-A-12)
Shows profile (masked contact with audited reveal buttons), type and salon link, status and suspension reason and date, booking history, reports against and by the user, and the same Suspend / Reactivate actions. Contents beyond "bookings and reports" are assumptions.

## PII rules for this screen
- Email and phone are shown masked (`n••••p@example.com`, `+94 77 ••• 4567`). The mockup shows them in full (README conflict 1).
- A Reveal control on the row or the detail page calls an audited API endpoint (`pii.revealed`), per field. Who may reveal: assumption, same roles that can view the list.
- Searching by full phone or email is allowed even though results are masked.
- Never log the search string or the revealed values.

## Screen states
| State | Behaviour |
|---|---|
| Loading | Row skeletons, the search input stays interactive |
| Empty | No users at all: "No users yet". No match: "No users match" with clear |
| Error | Inline retry |
| Forbidden | 403 for Finance (assumption); action buttons hidden for roles without `user.suspend` |
| Partial | Bookings count unavailable: show "-" |

## API (proposed)
- `GET /v1/admin/users?q=&type=&status=&page=&sort=` → `{ items[{ id, name, email_masked, phone_masked, type: client|partner, partner_role?: owner|specialist, salon?{ id, name }, bookings_count, joined_at, status: active|suspended, flag?{ reports_count, label } }], total }`
- `GET /v1/admin/users/{id}`
- `POST /v1/admin/users/{id}/suspend` body `{ reason_code, reason_text }` → `{ cancelled_bookings, refunded_cents }`
- `POST /v1/admin/users/{id}/reactivate` body `{ reason_code?, reason_text? }`
- `POST /v1/admin/users/{id}/reveal` body `{ field: email|phone }` (audited)

## Open questions
1. Suspending a partner: should the dialog warn about the salon's upcoming bookings and payouts? Different presets for staff?
2. Does Reactivate need a reason? (Assumed yes.)
3. Is there a way to suspend for a fixed period (temporary)?
4. Does the suspended user get an email, and does it include the reason?
5. May Moderator see contact details at all?
6. Date column: "Mar 2026" wraps to two lines in the mockup at 1024 px. Fix the column width.
