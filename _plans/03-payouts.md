# Plan 03: Payout accounts (A-05) and payout run (A-06)

Spec: `_specs/03-payouts.md`. Mockups: `admin/A-05_payout_accounts.png`, `admin/A-05_payout_account_revealed.png`, `admin/A-06_payout_run_approved.png`, `admin/A-14_reason_reject_payout_account.png`.
API: `http://localhost:8000` (`src/lib/api/schema.d.ts`; re-run `pnpm api:gen` first and commit any diff).
Depends on plans 00 to 02 (on `main`). Branch: `feature/payouts` (created from `main`). Do not commit unless asked.

## 0. What already exists

`ReasonDialog` + `reasonDialogs.rejectPayoutAccount` (labels match the spec), `MaskedValue` (value held in state only, 60 s auto-hide, clears on navigation and unmount, takes a `reveal` Server Action), `DataTable` (TanStack v9, cursor paging), `StatusPill` (`verified`, `pending`, `rejected` mapped), `runAdminAction`, `requirePermission`, `getNavCounts` (badge `payoutAccounts`), `formatLkr`, `formatDateTime`, `EmptyState`, `ErrorCard`, `SectionBoundary`, skeletons, logger redaction (already redacts `account_number`, `account_name`, `reason`). Permission keys `payout_account.verify`, `bank_account.reveal`, `payout_run.approve` exist. The routes do not exist; the sidebar and dashboard currently point at `/payout-accounts`.

## 1. API findings that change the spec

| # | Finding | Handling |
|---|---|---|
| 1 | Account list: `GET /v1/admin/payout-accounts?verified=&cursor=&limit`. Item: `salon_id, salon_name, bank_name, branch, account_name, account_last4, verified, verified_at, rejection_reason, rejected_at, created_at`. **No** `holder_matches_business`, `changed_at`, `held`, `status`, no `sort`. | Status is derived for display only: `rejected_at` set -> Rejected, `verified` -> Verified, else Pending (one pure function, tested). Mask is built from `account_last4` as `•••• •••• 4821`. |
| 2 | **No name-mismatch flag and no "Changed N days ago · payouts held" data.** | Not shown, and the spec's mismatch confirm on Verify cannot exist (the console must not compare names). Sub-line shows "New salon" is also not derivable, so use: Pending -> "Submitted {created_at date}", Verified -> "Verified {date}", Rejected -> "Rejected {date}". Gaps flagged for the API: `holder_matches_business`, `changed_at`, `held`. |
| 3 | Reveal is `POST /payout-accounts/{id}/reveal` with body `{reason}` (default "Verify bank details", required by schema) and returns `{account_number, ...}`. | No dialog (mockup). The action sends the fixed default reason so the audit row is meaningful. The Server Action returns only `account_number` to the client; response is never cached, never logged. |
| 4 | Verify is `POST .../verify` with optional `{notes}`; reject is `POST .../reject` with `{reason}` (required). No `reason_code`. | Verify: no dialog, empty body. Reject: `ReasonDialog` sends the label or free text (same as plan 00 finding 5). |
| 5 | `verified=false` also returns **rejected** accounts, so the sidebar badge and dashboard count (`getNavCounts`) over-count. | Filter `rejected_at` out in the count (list endpoint is already fetched); update `nav-counts` and its test. A user-visible number must not include rejected accounts. |
| 6 | **Payout runs have no `current`, no `approve`, no bank-file endpoint.** Real: `GET /payout-runs` (list, `status`), `GET /payout-runs/{id}` (with per-salon `lines`), `POST /payout-runs {period_start, period_end, dry_run}` (creates a run; `dry_run` gives estimates). `PayoutRunOut`: `status, period_start/end, total_cents, commission_total_cents, dispute_deductions_total_cents, net_total_cents, salon_count, estimated_*, initiated_by, lines[], created_at, completed_at`. (`total_cents` is gross: 500,000 - 62,500 = 437,500 in the schema example.) | Run card is built from the API's latest run: Salons `salon_count`, Gross `total_cents`, Commission `commission_total_cents`, Refunds `dispute_deductions_total_cents`, **Net `net_total_cents`** (never recomputed). No "3 held" and no commission % (the label is "Commission", the rate is not in the API). Period shown as a date range (week number is not supplied). |
| 7 | "Approve payout run" has **no matching endpoint**; the nearest is `POST /payout-runs` (create, `dry_run=false`), which creates and likely executes a run. Wiring a money-moving action to a different semantic without confirmation is unsafe. | Default: **read-only run card** plus a safe preview. Approve/Export render as disabled buttons with a visible explanation until product and the API team confirm the contract (open question 1). Implementation keeps one `approvePayoutRun` seam, so wiring it later is a small change. |
| 8 | Bank-file export has no endpoint. | Export button disabled: "Bank file export is not available yet". No `/api/export/payout-run` route is created (it would have nothing to stream). |
| 9 | Run **history and per-salon breakdown exist** (`GET /payout-runs`, `lines[]`). The spec listed both as gaps. | `/payouts/runs` shows run history (cursor-paged) and, for the selected run, the per-salon lines (salon, gross, commission, refunds, net, reference, status). Answers spec question 6. |
| 10 | Routes: spec says `/payouts/accounts` and `/payouts/runs`; the sidebar uses `/payout-accounts`. | Use the spec routes; update `nav-config`, the dashboard task link and `getNavCounts` consumers. Nothing else links to the old path. |

## 2. Step 0: verify with a real admin (needed)

Same blocker as plans 01 and 02. With a Finance or Super admin token: list accounts (both `verified` values), one reveal on a throwaway account, one verify and one reject, list runs, get one run, and (only with product sign-off) a `dry_run` create to see if it persists a row. Capture sanitised fixtures in `src/test/fixtures/payouts/` (no real account numbers). Confirm run `status` strings, that `account_last4` is always 4 digits, and the permission strings. If no credentials: build to the schema, mark mappers unverified, and say so.

## 3. Work breakdown

### Step 1. Accounts feature (`src/features/payouts/`)
- `schemas.ts` (Zod): `payoutAccountSchema`, `payoutAccountListSchema`, `payoutRunSchema`, `payoutLineSchema`, `payoutRunListSchema` (parse at the trust boundary, strip unknown fields; money fields must be integers).
- `account-status.ts` (pure): `accountStatus(a)`, `maskAccount(last4)`, `sortQueue(items)` (pending first, then `created_at` ascending, display order within the loaded page only), `holdsFor` not needed.
- `queries.ts` (server, `React.cache`): `getPayoutAccounts({filter, cursor})` mapping `?status=pending|verified|rejected|all` (nuqs) to the API `verified` param plus an in-page filter for rejected vs pending; `getLatestPayoutRun()`, `getPayoutRuns(cursor)`, `getPayoutRun(id)`.
- `actions.ts` (`"use server"`): `revealPayoutAccount(id)` (permission `bank_account.reveal`, fixed reason, returns `account_number` only), `verifyPayoutAccount(id, key)` (`payout_account.verify`), `rejectPayoutAccount(id, reason, key)` (`payout_account.verify`, reason 3..1000). All via `runAdminAction`, uuid-validated, with audit names `bank_account.revealed`, `payout_account.verified`, `payout_account.rejected`; `revalidatePath("/payouts", "layout")` on success. No reason or number in logs.
- Tests: status derivation (verified, pending, rejected, rejected-and-verified-false), mask, queue sort, schema parsing, action validation (bad id, empty reason), reveal returns only the number, forbidden role.

### Step 2. A-05 screen (`src/app/(console)/payouts/accounts/`)
Read `node_modules/next/dist/docs/` for Next 16 (`searchParams` is a Promise; nuqs server cache) before coding, and the TanStack Table v9 `getting-started` skill (already used by `DataTable`).
- `page.tsx`: `requirePermission("payout_account.verify")`, `TopBar` "Payout accounts" / "Verify where salons get paid". Table and run card each in `Suspense` + `SectionBoundary` so they fail independently (spec Partial state). Filter control (status) as links/segmented buttons via nuqs; empty: "No payout accounts need attention".
- Columns: Salon (name + sub-line from finding 2), Bank · branch, Account holder, Account number (`MaskedValue`), Status (`StatusPill`), Actions.
- Footnote copy from the spec verbatim.
- `loading.tsx`: table + card skeleton. `error.tsx`: `ErrorCard` with retry.

### Step 3. Row actions (`components/account-actions.tsx`, client)
- **Reveal**: `MaskedValue` with `reveal={() => revealPayoutAccount(id)}` (action returns the number). Shown only with `bank_account.reveal`. **One row revealed at a time**: add a small optional controlled mode to `MaskedValue` (`active`/`onActivate`, via a `RevealGroup` context in the table) so revealing another row hides the first; unchanged behaviour when unused (existing tests keep passing, new tests added). Failure keeps the mask and shows the inline error (toast per spec via `useActionErrorHandler`).
- **Verify** (pending only, `payout_account.verify`): green button, no dialog, `useTransition`, toast "Verified {salon}", `router.refresh()`, invalidate `TASK_COUNTS_KEY`. 409 -> existing stale handling.
- **Reject** (pending only): `ReasonDialog` with `reasonDialogs.rejectPayoutAccount(salon)`; toast "Rejected account for {salon}".
- Verified/Rejected rows: Reveal only. Rejected sub-line shows `rejection_reason` is **not** shown (could contain free text and is for the salon); only "Rejected {date}".
- UI gating is convenience; every action re-checks permission server-side.

### Step 4. Run card + page (`components/payout-run-card.tsx`, `/payouts/runs`)
- `PayoutRunCard` (Server Component): rows Salons, Gross sales, Commission, Refunds, **Net to salons** from the API values with `formatLkr`; period range via `formatShortDate`; status pill. A failed fetch renders `ErrorCard`, never partial numbers. Empty: "No run for this week yet".
- Buttons: "Approve payout run" and "Export bank file" disabled with the explanation text and `aria-describedby` (finding 7 and 8). State "Approved/Completed by {admin} on {date}" only if the API supplies it (`initiated_by` is an id, not a name, so show the date only).
- `/payouts/runs` page (`requirePermission("payout_run.approve")`): history table (period, salons, net, status, created) with cursor paging, and `/payouts/runs/[id]` showing the per-salon `lines` table. Empty/loading/error/forbidden states as above. The card is also rendered on the accounts page (README conflict 2).
- Held list link ("3 held") omitted (no data).

### Step 5. Cross-cutting
- `nav-config.ts`: `/payouts/accounts` (permission `payout_account.verify`, badge `payoutAccounts`); `tasks.ts` link -> `/payouts/accounts`; no new nav item for runs (reached from the card and the accounts page).
- `nav-counts.ts`: exclude rejected accounts from the `payoutAccounts` count (finding 5); update its test.
- Logging: ids and status only; never names, account numbers or reasons.
- Fixtures under `src/test/fixtures/payouts/` (sanitised).

### Step 6. Tests and quality gates
- Unit: see Step 1; plus nav count excludes rejected.
- Component (Testing Library): table renders statuses and masks from `account_last4`; Reveal shows the number, Hide clears it, 60 s clear (fake timers), only one row revealed at once, reveal failure keeps the mask; Verify success refreshes; Reject through `ReasonDialog` sends the label; Pending-only actions; run card shows API values (no recomputation: a fixture where net != gross - commission - refunds still renders `net_total_cents`), error card on failure, disabled approve/export with explanation; axe on table and card.
- E2E: 403 for Support/Moderator if a seeded role exists; otherwise manual.
- Finish with `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`; then run the app and smoke-test signed-out redirects. Report honestly, including unverified mappings.

## 4. File map (new/changed)

```
src/features/payouts/{schemas.ts,account-status.ts,queries.ts,actions.ts}
src/features/payouts/components/{accounts-table,account-actions,payout-run-card,run-history,run-lines}.tsx
src/app/(console)/payouts/accounts/{page.tsx,loading.tsx,error.tsx}
src/app/(console)/payouts/runs/{page.tsx,[id]/page.tsx,loading.tsx,error.tsx}
src/components/sb/masked-value.tsx (+ optional RevealGroup, tests)
src/components/sb/nav-config.ts  src/features/dashboard/tasks.ts  src/lib/api/nav-counts.ts (+ test)
src/test/fixtures/payouts/*  (+ tests beside each module)
```

## 5. Open questions (defaults in brackets)

1. What does "Approve payout run" map to: `POST /payout-runs` (`dry_run=false`) or a missing approve endpoint? Is a draft/dry-run persisted? [Do not wire money movement; read-only card with disabled Approve until confirmed. API team to add `approve` and a "current run" read.]
2. Bank file: format, bank, endpoint. [Disabled; not built.]
3. API to add `holder_matches_business`, `changed_at`, `held`, a `status` enum and `sort`. [Not assumed; spec warnings omitted.]
4. Reveal reason: fixed "Verify bank details" for every reveal. [Yes; or add a reason picker later.]
5. 4-eyes approval, mismatch sign-off, reject reversibility, how long rejected rows show. [Out of scope; rejected rows stay visible under the filter.]
6. Commission label (rate/overrides). [Plain "Commission".]
7. Is `/payouts/runs` allowed for admins who can verify accounts but not approve runs? [Gate by `payout_run.approve`.]

## 6. Done criteria

- Finance and Super admin see `/payouts/accounts` with masked numbers built from `account_last4`; Support and Moderator get the 403 page and no nav item.
- Reveal calls the audited endpoint, shows the number for one row at a time, and clears it on Hide, after 60 s, on navigation and on unmount; the number never appears in URLs, logs or caches.
- Verify and Reject work as specified, update row, badge and dashboard count together, and the badge excludes rejected accounts.
- The run card shows API values only (never recomputed), fails as a whole section, and Approve/Export are visibly unavailable until the API contract is confirmed; run history and per-salon lines are viewable.
- Lint, typecheck, tests and build pass; every unverified mapping and API gap is listed in the report.
