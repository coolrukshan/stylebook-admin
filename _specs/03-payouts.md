# A-05 Payout accounts · A-06 Payout run

Mockups: `A-05_payout_accounts.png`, `A-05_payout_account_revealed.png`, `A-06_payout_run_approved.png`, `A-14_reason_reject_payout_account.png`.

**Roles:** Finance and Super admin. Support and Moderator: the pages are hidden (the matrix gives them no reveal, verify or run permission).
**Stories:** US-A-07, US-A-08, US-A-09. SRS: ADM-07, ADM-09, ADM-16.

## A-05 Payout accounts (`/payouts/accounts`)

Title "Payout accounts", subtitle "Verify where salons get paid".

**Table columns:** Salon · Bank · branch · Account holder · Account number · Status · Actions.

| Cell | Content |
|---|---|
| Salon | Name, plus a sub-line: "Changed 2 days ago · payouts held", "New salon", or "Verified 12 Aug" |
| Bank · branch | "Commercial Bank · Kollupitiya" |
| Account holder | Name. A warning line in amber "Differs from business name" when the holder does not match the salon's business name |
| Account number | Masked `•••• •••• 4821` (mono font) |
| Status | `Pending verification` (warning) or `Verified` (success). `Rejected` likely exists (gap). |
| Actions | Pending rows: **Reveal**, **Verify** (green), **Reject** (red outline). Verified rows: **Reveal** only. |

Footnote under the table: "Account numbers are stored encrypted. Only finance and super admins can reveal them, and every reveal is written to the audit log. When a salon changes its bank details, its payouts are held until an admin verifies the new account."

### Acceptance criteria

**Reveal**
- Given I have `bank_account.reveal`, when I click Reveal, then the console calls the reveal endpoint (audited by the API). The full number replaces the mask (`8001 2348 4821`) in that row, and the button turns into **Hide**.
- Given I click Hide, then the row shows the mask again. No API call is needed.
- Given the reveal call fails or I lack permission, then the number stays masked and a toast explains.
- Given I navigate away, refresh, or 60 s pass (assumption), then the value is cleared. The number is never kept in the URL, cache, or logs.
- Only one row revealed at a time (assumption, minimises exposure).
- No ReasonDialog on reveal (mockup). The audit entry records who, which account, when and IP.

**Verify**
- Given a pending account, when I click Verify, then no dialog opens (pure approval). The status becomes Verified, "Verified {date}" appears, the Actions column shows only Reveal, the sidebar badge decreases, and the salon's payouts are released from hold for the next run.
- Given the holder name differs from the business name, then Verify still works but shows a one-step confirm: "The holder name doesn't match the business. Verify anyway?" **Assumption, confirm with the product owner** (US-A-07 only requires the warning).
- Audit: `payout_account.verified`.

**Reject**
- When I click Reject, then ReasonDialog opens ("Reject payout account · {salon}", red confirm "Reject account").
- Given I confirm, then payouts stay on hold, the salon is asked to add a new account, and audit `payout_account.rejected` with reason is written.
- Preset reasons: Name does not match business · Bank letter unreadable · Suspected fraud · Other.

**Warnings**
- Name mismatch is supplied by the API as a flag (`holder_matches_business: false`). The console does not compare names.
- "Changed 2 days ago · payouts held" shows when a verified account was edited. The salon's payouts are held until verification.

### Sorting and filters
Pending first, then by `changed_at` ascending (assumption). Filter by status via `nuqs` (`?status=pending`). Server-side paging.

## A-06 Payout run (card in mockup; route `/payouts/runs`)

The mockup shows the card under the A-05 table. See README conflict 2.

**Card "Payout run · week 43":**

| Row | Demo value |
|---|---|
| Salons | `112 · 3 held` |
| Gross sales | LKR 8,920,400 |
| Commission (8%) | LKR 713,632 |
| Refunds | LKR 41,200 |
| **Net to salons** | LKR 8,165,568 |

Primary button (black pill): **Approve payout run**. After approval the same button reads **Run approved · export bank file** and exports the bank file.

(Demo arithmetic: 8,920,400 − 713,632 − 41,200 = 8,165,568. The console must still not compute it. These are API values.)

### Acceptance criteria
- Given the current week's run is Draft, when I open the page, then the totals come from the API and the button reads "Approve payout run".
- Given I click Approve payout run, then a confirmation step opens summarising salons paid, salons held and net total (read from the API) because the action moves money. **Assumption:** the mockup shows no dialog, but the action is irreversible. A plain confirm (no reason) is enough.
- Given I confirm, then the API approves the run. The button changes to "Run approved · export bank file". Audit `payout_run.approved` ("Approved payout run week 42 · 109 salons" in A-13).
- Given the run is approved, when I click Export bank file, then the browser downloads the file streamed through `/api/export/payout-run` from the API (audited, `payout_run.exported`).
- Given held salons (3 held), then they are excluded from the run. A link on "3 held" opens the held list (the pending accounts above). They are paid in a later run once verified.
- Given a run was already approved by someone else, then Approve is hidden, the state shows "Approved by {admin} on {date}", and Export stays available.
- Given the run is empty or all salons are held, then Approve is disabled with the explanation "No salons are ready to pay".
- Refunds include approved dispute refunds, taken out of each salon's next payout (A-08).
- Approver separation (4-eyes) is **not** specified. See open question.

### Statuses (proposed): `draft` → `approved` → `exported` → (`paid`, set by the API/bank). Only the first two appear in the mockup.

## Screen states
| State | Behaviour |
|---|---|
| Loading | Table and card skeletons |
| Empty | Accounts: "No payout accounts need attention". Run: "No run for this week yet" |
| Error | Inline card with retry. A failed run total must not render partial numbers |
| Forbidden | 403 page for Support and Moderator |
| Partial | Run card fails while the table loads (or the opposite): each section loads independently |

## API (proposed)
- `GET /v1/admin/payout-accounts?status=&page=&sort=` → `[{ id, salon{ id, name }, bank, branch, holder_name, holder_matches_business, account_masked, status, changed_at, verified_at, held }]`
- `POST /v1/admin/payout-accounts/{id}/reveal` → `{ account_number }` (audited, no-store, `Cache-Control: no-store`)
- `POST /v1/admin/payout-accounts/{id}/verify`
- `POST /v1/admin/payout-accounts/{id}/reject` body `{ reason_code, reason_text }`
- `GET /v1/admin/payout-runs/current` → `{ id, week, status, salons_count, held_count, gross_cents, commission_rate, commission_cents, refunds_cents, net_cents, approved_by?, approved_at? }`
- `POST /v1/admin/payout-runs/{id}/approve`
- `GET /v1/admin/payout-runs/{id}/bank-file` (stream, audited)
- Gap: run history (`/payouts/runs` list) and a per-salon breakdown. The mockup shows totals only.

## Open questions
1. Should the run approver be a different admin from whoever verified the accounts (4-eyes)? Same for large runs above a threshold?
2. What is the bank file format and which bank? Is there more than one (Commercial, Sampath, BOC, HNB appear in the data)?
3. Does a salon with a name mismatch need Super admin sign-off, or can Finance verify?
4. Is Reject reversible? Can the salon re-submit the same account?
5. Does a rejected account show in the table, and for how long?
6. Does the run show a per-salon preview before approval? (Finance would expect to see who is paid.)
7. Is "Commission (8%)" a single rate when salons have overrides (A-09)? The label should come from the API.
