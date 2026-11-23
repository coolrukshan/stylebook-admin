# StyleBook Admin Console: Specs

Source: `STYLEBOOK_ADMIN_CONSOLE_INSTRUCTIONS.md` and the mockups in `admin/*.png`. Written by the BA role for `dev`.

`openapi.json` / `src/lib/api/schema.d.ts` is **not in the repo yet**. Every endpoint below is **proposed** (path and fields inferred from the mockups). Verify each one against the generated types and log gaps.

## Files

| File | Screens | Mockups |
|---|---|---|
| [00-shared.md](00-shared.md) | Shell, roles and permissions, formats, states, ReasonDialog catalogue, audit events | all |
| [01-access-dashboard-search.md](01-access-dashboard-search.md) | A-01, A-02, A-03 | A-02, A-03 |
| [02-salon-applications.md](02-salon-applications.md) | A-04 | A-04 ×2, A-14 ×2 |
| [03-payouts.md](03-payouts.md) | A-05, A-06 | A-05 ×2, A-06, A-14 |
| [04-users.md](04-users.md) | A-07 | A-07, A-14 |
| [05-disputes.md](05-disputes.md) | A-08 | A-08, A-14 |
| [06-fees.md](06-fees.md) | A-09 | A-09 |
| [07-engagement.md](07-engagement.md) | A-10 | A-10 |
| [08-roles-audit.md](08-roles-audit.md) | A-12, A-13 | A-12, A-13 |
| [09-unmocked-screens.md](09-unmocked-screens.md) | A-11, A-15–A-19 | none (text spec only) |

## Cross-cutting conflicts between the mockups and the instructions

These need a product-owner decision. Each file repeats the ones that affect it.

1. **PII is shown unmasked in the mockups.** A-07 shows full emails and phones, and A-02 search shows a full phone. The rules say phone and email are partially masked by default, with audited reveals. Assumption: build masked (`n****p@example.com`, `+94 77 *** 4567`) and treat the mockup as demo data.
2. **A-06 has no page of its own in the mockup.** The payout run card sits under the A-05 table, and the button changes from "Approve payout run" to "Run approved · export bank file". The instructions list `/payouts/runs` as a separate route. Assumption: build the run card as a component, show it on both routes, and keep `/payouts/runs` as the full page.
3. **Refund decisions (Full refund / 50%) have no reason dialog in the mockups.** Only "Reject" has one. The rule says every write except a pure approval needs a reason. Assumption: both refund buttons use a lighter confirm step that includes a reason (see open question in 05).
4. **"Verify" and "Approve" open no dialog.** This is consistent with the "pure approval" exception.
5. **Audit timestamps.** The mockup shows "25 Oct, 09:12", while the global format is "Thu 29 Oct, 9:30 AM" and audit times must show the time zone. Assumption: the audit log uses "Sat 25 Oct, 9:12 AM (Asia/Colombo)" in full, with relative "Just now" for entries under 1 minute old.
6. **Dashboard counts.** The "Open disputes" KPI is 2 (oldest 3 days) while "Disputes waiting for a decision" is 3. The two metrics use different definitions. The API must supply both. Do not derive one from the other.
7. **Permission matrix gaps.** The matrix has 8 rows. It has no row for verify payout accounts, request info or reject salon, view audit log, edit re-engagement, reports, or the A-15–A-19 screens. See 00-shared.
8. **Re-engagement shows a model name** (`claude-haiku-5-5`). Treat it as read-only API data.

## Global open questions

1. Is the audit log visible to all admins? US-A-18 says "any admin", but it exposes IPs and reasons.
2. Is there a salon-owner notification template library (request info, reject)? Who owns the copy?
3. Does "Hide" (hide an account number) also write an audit entry? Assumption: no, because it is client-side only.
4. Super admin lockout: can the last super admin be demoted or deactivated?
5. Which countries does "all countries" cover, and is there a country or period filter on the dashboard?
