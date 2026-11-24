# Plan 04: Users (A-07, with A-14 suspend/reactivate)

Spec: `_specs/04-users.md`. Mockups: `admin/A-07_users.png`, `admin/A-14_reason_suspend_user.png`.
API: `http://localhost:8000` (`src/lib/api/schema.d.ts`; re-run `pnpm api:gen` first and commit any diff).
Depends on plans 00 to 03 (on `main`). Branch: `feature/users` (created from `main`). Do not commit unless asked.

## 0. What already exists

`ReasonDialog` + `reasonDialogs.suspendUser` / `reactivateUser` (labels and note match the spec), `MaskedValue` (masked-only when `reveal` is omitted), `DataTable` (client, cursor paging via nuqs `cursors`), `StatusPill` (`active`, `suspended` mapped), `runAdminAction`, `requirePermission`, `formatMonthYear`, `formatLkr`, `EmptyState`, `ErrorCard`, `SectionBoundary`, skeletons, nuqs adapter, logger redaction (already redacts `email`, `phone`, `q`, `query`, `reason`). Permission keys `users.view` and `user.suspend` exist and `/users` is already in the sidebar. Plan 03 lesson: `DataTable` cells must not depend on changing state (cells remount); keep columns stable.

## 1. API findings that change the spec

| # | Finding | Handling |
|---|---|---|
| 1 | `GET /v1/admin/users` takes `q`, `role`, `is_active`, `cursor`, `limit`. Item: `id, phone, email, full_name, role, is_active, suspended_at, suspend_reason, booking_count, order_count, total_spend_cents, created_at`. **No** total, no `email_masked`/`phone_masked`, no salon, no flag, no `sort`. | Show "{n} shown" for the page, with "+" when `next_cursor` exists (a true "8 of 1,240" needs an API total: gap). Order is newest first within the loaded page (display only). |
| 2 | **The API returns email and phone unmasked** (the spec assumes masked fields). | Mask on the server inside the query mapper, before data reaches any client component: new pure `maskEmail` / `maskPhone` in `src/lib/format/mask.ts` (`n••••p@example.com`, `+94 77 ••• 4567`). Rows passed to the client contain only masked strings; a test asserts raw values never appear in the mapped row. Stopgap until the API masks; flag in the PR. |
| 3 | **No reveal endpoint** for email/phone. | Masked only, no Reveal button (same as plan 00 finding 6). Searching by a full phone/email still works because `q` goes to the API. |
| 4 | Suspend: `POST /users/{id}/suspend` body `{reason}` (required) -> `SuspendOut {id, is_active, suspended_at, suspend_reason, suspended_by}`. **No `cancelled_bookings` / refund count.** Reactivate: `POST .../reactivate` body `{note?}` (nullable). No `reason_code`. | Suspend sends `reason` (label or free text); the toast is "{name} suspended" without a number. Reactivate keeps the spec's assumed reason dialog and sends it as `note`; whether the API requires it is open. |
| 5 | No flag data on the list ("6 reports · suspected spam reviews"). Detail has `dispute_count`, `review_count`. | The red flag line is omitted on the list (gap). The detail page shows the counts it has; no "reports against/by" section (needs moderation data, spec 07). |
| 6 | `role` is a free string; the allowed values and the Client/Partner/owner/specialist distinction are unknown. Salon is only on detail (`salons_owned`). | Type column renders a label from a small `roleLabel` map with a raw-string fallback (never hidden). Type filter is **not built** until Step 0 confirms the role values (it is an assumption, not in the mockup); status filter (`is_active`) is. Partner "· {salon}" suffix appears on the detail page only. |
| 7 | Detail: `GET /users/{id}` -> `AdminUserDetail` (full_name, phone, email, role, is_active, suspended_at/by, suspend_reason, booking/order/total_spend/dispute/review/favourite counts, last_booking_at, auth_provider, created_at, `salons_owned[]`, `recent_bookings[]`, `recent_orders[]`). | Build the detail page from this (spec calls it a gap). Same server-side masking. `suspended_by` is an id, not a name: show date and reason only. |
| 8 | "Cannot suspend yourself or another admin": admins live under `/admin/admins`, not this list. | Hide actions when the role looks like an admin role (`admin`, `super_admin`, `support`, `finance`, `moderator`) and rely on the API's own refusal (409/403 handled by the shared error handler). Not a security boundary. |
| 9 | Permission: finance access is an assumption. | Page gated by `users.view`, actions by `user.suspend`, re-checked in Server Actions. Whether Finance holds `users.read` comes from Step 0. |
| 10 | The search string goes in the URL (`?q=`) per spec. | Allowed; never logged (`q` is already redacted). Search is a client island with a 300 ms debounce (or Enter) writing `q` via nuqs with `shallow: false`; the server page reads it. |

## 2. Step 0: verify with a real admin (needed)

Same blocker as earlier plans. With a Support or Super admin token: list users (no filter, `is_active=false`, `q` as email, as `077...`, and as `+9477...` to see if numbers are normalised), one detail, `role` values present, and suspend then reactivate on a throwaway user (check the reactivate body and whether it needs a note). Save sanitised fixtures in `src/test/fixtures/users/` (synthetic data only). If no credentials: build to the schema, mark `role` handling and the phone-search behaviour as unverified, and say so.

## 3. Work breakdown

### Step 1. Masking (`src/lib/format/mask.ts`)
- `maskEmail("nimal.perera@example.com")` -> `n••••a@example.com` (first and last char of the local part; short locals keep one char), `maskPhone("+94771234567")` -> `+94 77 ••• 4567` (also accepts `0771234567`, `94771234567`, spaced input). Unknown formats fall back to keeping the last 4 digits only. Null/empty -> "".
- Tests: standard, short local part, no `@`, local numbers, odd lengths, never returns the middle digits.

### Step 2. Feature module (`src/features/users/`)
- `schemas.ts` (Zod): `userListItemSchema`, `userListSchema`, `userDetailSchema` (unknown fields stripped), `REASON_MIN/MAX`.
- `map.ts` (pure, tested): `toUserRow(item)` returns `{id, name, emailMasked, phoneMasked, roleLabel, bookings, joinedAt, status: "active"|"suspended", canAct}` and **drops raw email/phone**; `toUserDetail(d)` likewise. `userStatus(is_active)`, `roleLabel(role)`, `isAdminRole(role)`.
- `queries.ts` (server, `React.cache`): `getUsers({q, status, cursor})` (maps status to `is_active`, trims `q`, ignores a `q` shorter than 1 char), `getUser(id)` (404/422 -> `notFound()`).
- `actions.ts` (`"use server"`): `suspendUser(id, reason, key)` (`user.suspend`, reason 5..1000 to match the API's earlier suspend minimum, audit name `user.suspended`), `reactivateUser(id, reason, key)` (`user.suspend`, `user.reactivated`, body `{note: reason}`). uuid-validated, `revalidatePath("/users", "layout")`, no reason or contact data logged.
- Tests: mapper never leaks raw contact, status/role mapping, action validation and permission/audit names, suspended-at null handling.

### Step 3. List screen (`src/app/(console)/users/`)
Read `node_modules/next/dist/docs/` for Next 16 `searchParams` (Promise) and nuqs `shallow: false` before coding.
- `page.tsx`: `requirePermission("users.view")`, `TopBar` "Users" / "Clients and partner staff". `UserSearch` + status filter + `UsersTable` in `Suspense` + `SectionBoundary` (input stays interactive while the table loads; spec Loading state). Count text: "{n} shown" (+ "+" with next cursor).
- Empty states: no users at all -> "No users yet"; with `q` -> `No users match "{q}"` with clear link (query rendered in the DOM only).
- `loading.tsx` (row skeletons), `error.tsx` (`ErrorCard`).
- Columns (stable, module-scope column defs): Name (bold, link to `/users/[id]`), Email · phone (two masked lines, mono), Type, Bookings (`booking_count`), Joined (`formatMonthYear`, `whitespace-nowrap` plus a min width so "Mar 2026" never wraps, spec question 6), Status (`StatusPill`), Action.
- Action cell: Active -> **Suspend** (ReasonDialog `suspendUser(name)`), Suspended -> **Reactivate** (ReasonDialog `reactivateUser(name)`), only with `user.suspend` and `canAct`. Toast, `router.refresh()`, shared 409/403 handling. Sub-line for suspended rows: "Suspended {date}" (reason not shown in the list).

### Step 4. Search and filters (`components/user-search.tsx`, `user-filters.tsx`, client)
- `UserSearch`: controlled input, `aria-label` "Find user", placeholder "Name, email or phone", 300 ms debounce and Enter to submit, writes `q` (nuqs, `shallow: false`, resets `cursors`), clear button. No logging.
- Status filter links (All / Active / Suspended) via the URL; type filter deferred (finding 6).

### Step 5. Detail page (`/users/[id]`)
- `page.tsx`: `requirePermission("users.view")`; header (name, pill, role label, joined), masked contact (no reveal), status block (suspended date and reason, or "Active"), counts (bookings, orders, total spend via `formatLkr(total_spend_cents)`, disputes, reviews, favourites, last booking), `salons_owned` list with active/inactive pill (link target `/salons/[id]` is not built yet: render as plain text, note it), recent bookings and orders tables (reference, salon, status, date, order total). Same Suspend/Reactivate actions in the header.
- `loading.tsx`, `error.tsx`, 404 via `notFound()`.

### Step 6. Cross-cutting
- Nav item already points at `/users`; no change. Dashboard has no users link.
- Reuse and extend `maskPii`? No: keep it for free text; document the difference in `mask.ts`.
- Fixtures in `src/test/fixtures/users/*` (synthetic).

### Step 7. Tests and quality gates
- Unit: mask helpers, mappers (no raw PII in output), actions, status/role mapping.
- Component (Testing Library): table shows masks only, status pills, Suspend/Reactivate by status, hidden without `user.suspend` and for admin roles; Suspend through `ReasonDialog` sends the label, Other needs 10+ chars, Reactivate sends the note, 409 toast + refresh; search debounce (300 ms, Enter immediate, resets cursors); empty states; axe on list and detail.
- E2E: only the 403 path if a seeded limited role exists; otherwise manual.
- Finish with `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, then run the app and smoke-test signed-out redirects for `/users` and `/users/[id]`. Report honestly, including unverified mappings.

## 4. File map (new/changed)

```
src/lib/format/mask.ts (+ test)
src/features/users/{schemas.ts,map.ts,queries.ts,actions.ts}
src/features/users/components/{users-table,user-search,user-filters,user-actions,user-detail,recent-activity}.tsx
src/app/(console)/users/{page.tsx,loading.tsx,error.tsx,[id]/page.tsx,[id]/loading.tsx}
src/test/fixtures/users/*  (+ tests beside each module)
```

## 5. Open questions (defaults in brackets)

1. API to return masked contact fields and a reveal endpoint (`pii.revealed`). [Mask in the console now; no reveal.]
2. API to add `total`, `sort`, a report flag (`reports_count`, `label`), `salon` and partner role on the list. [Not assumed; "N shown" with "+", no flag line.]
3. Valid `role` values and a type filter. [Label fallback; filter deferred until confirmed.]
4. Suspend response lacks cancelled-booking and refund counts. [Generic toast.]
5. Partner suspension warning and presets (spec Q1), temporary suspension (Q3), user email on suspend (Q4), Moderator seeing contact (Q5). [Out of scope; single dialog.]
6. Does Reactivate require a note? [Dialog asks for it; sent as `note`.]

## 6. Done criteria

- Support, Moderator and Super admin (per real permissions) see `/users` with masked email and phone built server-side; raw contact data never reaches client props, logs or the URL (only the typed `q`).
- Typing in Find user filters server-side after 300 ms or Enter, the link is shareable, and empty/no-match/error states work.
- Suspend and Reactivate go through the reason dialog, send once (stable idempotency key), update row and detail, and the shared 409/403 handling applies; actions are hidden without `user.suspend` and re-checked on the server.
- `/users/[id]` shows profile, status, counts, owned salons and recent activity.
- Lint, typecheck, tests and build pass; unverified mappings and API gaps (masking, reveal, total, sort, flags, cancelled counts) are listed in the report.
