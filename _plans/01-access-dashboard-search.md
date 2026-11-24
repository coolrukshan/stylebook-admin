# Plan 01: Sign-in + 2FA + lock (A-01), Global search (A-02), Dashboard (A-03)

Spec: `_specs/01-access-dashboard-search.md`. Mockups: `admin/A-02_global_search.png`, `admin/A-03_dashboard.png` (A-01 has none).
API: `http://localhost:8000` (checked against `/openapi.json`, "StyleBook API 0.1.0").
Depends on plan 00 (committed as `ff21f7a`). Branch: continue on `feature/project-setup` unless told otherwise; do not commit unless asked.

## 0. What already exists from plan 00

Session (iron-session) + `src/proxy.ts` (anonymous/expired -> `/login?next=`, idle -> `/lock?next=`), `requirePermission`, `runAdminAction`, API client with headers and error mapping, `getNavCounts()`, `StatCard`, `SectionBoundary`, `ErrorCard`, `EmptyState`, skeletons, `GlobalSearch` shell (⌘K palette frame, no logic), stub `/login` and `/lock`, placeholder `/` page, `signOutAndReturn` action. This plan replaces the stubs and placeholder with real screens.

## 1. API findings that change the spec

| # | Finding | Handling |
|---|---|---|
| 1 | Real auth endpoints: `POST /v1/admin/auth/login {email,password}` -> `{access_token?, requires_totp, partial_token?, totp_setup_required, totp_uri?, totp_secret?, expires_in?}`; `POST /auth/totp {partial_token, totp_code(6)}`; `POST /auth/totp/setup {partial_token, totp_code}` -> `{access_token, recovery_codes[]}`; `POST /auth/recovery {partial_token, recovery_code}`; `POST /auth/logout` (204). The spec's `/2fa`, `/refresh`, `/unlock` **do not exist**. | Build against the real ones. |
| 2 | The API **does support 2FA enrolment** (`totp_setup_required`, `totp_uri`, `totp_secret`, recovery codes). Answers spec open questions 1 and 2. | Default: an admin without 2FA cannot reach the console; sign-in is forced into an enrolment step (QR + manual secret, confirm with a code, then show recovery codes once). Needs a QR renderer (add `qrcode.react`; render client-side from `totp_uri`). |
| 3 | A recovery-code path exists. | Add "Use a recovery code" link on the 2FA step. Not in spec; small and low risk. Flag in PR. |
| 4 | **No unlock endpoint, no refresh.** Admin token = 60 min JWT. | `/lock` cannot verify TOTP alone. Default (already chosen in plan 00): unlock = full re-login. `/lock` screen explains "Your session was locked after 30 minutes of inactivity", shows the admin name from the session, and a "Sign in again" action returning to `next`. The spec's "three failures sign out" is moot; sign-in's own rate limit applies. |
| 5 | **No `/admin/dashboard` endpoint.** | Compose from `GET /v1/admin/reports?type=...&period=...` (revenue, bookings, salons, users, commissions) plus list endpoints for tasks (see section 3). Exact response shapes (`summary.total`, `change_percent`, `data[]`) must be inspected with an authenticated call before coding the mapper. Anything the API cannot supply renders "Not available" rather than being computed client-side. **Recommend asking the API team for `GET /v1/admin/dashboard`.** |
| 6 | **No SSE / realtime endpoint** exists. | Skip SSE; use the spec's fallback: TanStack Query polling every 60 s for dashboard tasks and sidebar badges. |
| 7 | Search: `GET /v1/admin/search?q=(1..200)&type=<users\|salons\|bookings\|orders\|disputes>&cursor&limit(<=50, default 20)`; items `{type,id,title,subtitle?,status?,created_at}`. No `href_hint`, no owning-user id on bookings/orders, `type` accepts **one** value, results are cursor-paged and not grouped. | Client groups by `type`, caps 5 per type / 15 total; `limit=20` single call without `type`. Navigation map built client-side (users -> `/users/:id`, salons -> `/salons/:id`, disputes -> `/disputes/:id`). Whether the API pre-masks PII in `subtitle` must be verified. If not masked, mask phone/email in the UI with a conservative helper (document as a stopgap). |
| 8 | Booking and order results have **no destination** and no owner id. | Default: show them in results; selecting opens a read-only dialog (title, subtitle, status, created date) with no link out. Flag as a gap for the API (needs owner ids). |
| 9 | `429` returned for rate limits; `Retry-After` header not documented. | Read `Retry-After` if present for "try again in N minutes"; otherwise "Too many attempts, try again later." Extend `errors.ts` to carry `retryAfterSeconds`. |
| 10 | `/v1/admin/me` has `totp_enabled`, `last_login_at`. | Show nothing extra in v1; use `totp_enabled` for the sidebar footer's "2FA on" text instead of the hardcoded string (plan 00 hardcodes it). |
| 11 | Permission strings are still unverified. | Step 0 below resolves this with a real call; update `API_PERMISSIONS` and the Dashboard gating. |

## 2. Step 0: verify with a real admin (blocker for accurate mapping)

I need an admin account on the local API (email/password and a way to get a TOTP, or a seeded dev admin). Then:
- Call login/totp, then `/admin/me`, `/admin/reports?type=revenue|bookings|salons|users|commissions`, `/admin/search?q=a`, and the three task lists. Save sanitised sample shapes in `src/test/fixtures/` (no real PII) for MSW tests.
- Confirm real permission keys, statuses (`pending`, `admin_review`, ...) used by `getNavCounts`, and whether `X-Request-Id` is echoed.
- If no credentials are available, build against the OpenAPI schema, mark the dashboard mapper as unverified, and say so in the report.

## 3. Work breakdown

### Step 1. Auth server logic (`src/features/auth/`)
- `schemas.ts` (Zod): `loginSchema {email, password}`, `totpSchema {code: /^\d{6}$/}`, `recoverySchema`.
- `actions.ts` (Server Actions, no `requirePermission` since pre-auth): `loginAction`, `verifyTotpAction`, `setupTotpAction`, `recoveryAction`, `logoutAction`.
  - Login stores `partialToken` (+ `totpSetup {uri, secret}` when enrolling) in the **sealed session cookie** only; the browser never receives the partial token. Extend `SessionData` for a `pending` state; `evaluateSession` treats pending as anonymous for the proxy.
  - On final success: set `accessToken`, `expiresAt` from `expires_in`, `adminId` (via `/admin/me`), `lastActiveAt`; clear partial state; redirect to `safeNextPath(next)` (already exists).
  - Errors: return generic "Email, password or code is incorrect" for 401/404/422-credential cases; never reveal which part failed; 429 -> lockout copy with minutes; other -> "Something went wrong" with request id. Never log credentials/codes (logger redaction exists; add `password`, `totp_code`, `recovery_code`, `partial_token` to its list and test it).
  - Idempotency-Key is not needed for auth calls; skip it (do not retry credentials).
- `logoutAction`: call `POST /auth/logout` (ignore failure), destroy the session, redirect to `/login`. Wire into the sidebar footer (add a small "Sign out" control; accessible label).

### Step 2. A-01 screens (`src/app/(auth)/`)
Routes per spec: `/login`, `/login/2fa`, `/lock`. Centered card on `bg-background`, logo, tokens only.
- `/login`: email + password (React Hook Form + Zod, `useActionState`), pending button, inline generic error, lockout state (disabled button + message). Redirect to `/login/2fa` when `requires_totp`, to `/login/2fa/setup` (or a step within 2fa) when `totp_setup_required`. Authenticated users hitting `/login` redirect to `/`.
- `/login/2fa`: 6-digit input (`inputMode=numeric`, `autocomplete=one-time-code`, auto-submit on 6 digits, paste friendly), "Use a recovery code" toggle, "Back to sign in" (clears pending). Guard: no pending session -> redirect to `/login`.
- `/login/2fa/setup`: QR (from `totp_uri`, client component) + manual secret in mono font + code input; on success show recovery codes once with copy and "I have saved these" confirm before continuing. Secret/QR never go into URL or storage.
- `/lock`: replace stub per finding 4; keep the `next` param; "Sign in again" posts to `signOutAndReturn`.
- Accessibility: labelled fields, `aria-live` error region, focus to first field/error, no colour-only states. Reuse `ui/input`, `ui/button`. Add shared `AuthCard` in `src/components/sb/auth-card.tsx`.

### Step 3. Search backend + client (`src/features/search/`)
- `src/app/api/search/route.ts` (GET): reads session, calls `/v1/admin/search`, validates `q` (2..200 chars) with Zod, `Cache-Control: no-store`, returns a **normalised** `{results: [{type,id,title,subtitle,status,href|null}]}` (no created_at needed beyond the dialog, keep it). Unauthenticated -> 401 JSON. Does not log the query or response. Error -> `{error: "unavailable"}` with 502, never raw API text.
- `queries.ts` (client, TanStack Query): `useGlobalSearch(q)`, 250 ms debounce, enabled at `q.length >= 2`, `staleTime` small, `placeholderData: keepPreviousData`, aborts on change. Add `QueryClientProvider` in the console layout (not root; auth pages do not need it).
- `group-results.ts` (pure, tested): group by type in fixed order (users, salons, bookings, orders, disputes), cap 5 per type / 15 total, `hrefFor(item)` map.
- Mask helper stopgap (finding 7): `mask-pii.ts`, only if the API does not already mask; unit-tested.

### Step 4. A-02 UI: finish `GlobalSearch` (`src/components/sb/global-search.tsx`)
- Keep ⌘K / Ctrl+K; add `/` to focus/open when not in an input or textarea.
- `CommandInput` controlled, results via `CommandGroup` per type with a type pill (`StatusPill`-style neutral pill, text label), title bold, subtitle muted, `shouldFilter={false}` (server does the filtering).
- States: idle ("Type at least 2 characters"), loading (spinner in input, `aria-busy`), empty `No matches for "{q}"` (query shown only in the DOM, never logged), error "Search is unavailable" + retry, forbidden types simply absent.
- Enter/click: `router.push(href)` and close; booking/order open the read-only dialog (finding 8). Esc closes. Focus returns to the trigger.
- Tests (Testing Library + MSW): debounce (no call under 2 chars, one call after 250 ms), grouping/caps, keyboard nav, empty/error, navigation, ⌘K and `/` shortcuts, axe.

### Step 5. A-03 dashboard (`src/features/dashboard/`, `src/app/(console)/page.tsx`)
- `requirePermission("dashboard.view")` (re-check key after Step 0). Page title "Platform overview", subtitle "Last 7 days · all countries" (fixed label, spec assumption 1).
- `queries.ts` (server, `React.cache`): one function per card so each fails independently:
  - Active salons (+ delta), New sign-ups (Clients), Bookings (+ no-show rate), GMV, Commission (+ default rate), Open disputes (+ oldest age).
  - Source per finding 5: reports endpoints with `period` covering 7 days via `from_date`/`to_date` (date in Asia/Colombo); open disputes from `/admin/disputes` by status. Values are mapped, never recomputed. If an API field is missing the card shows its value as "-" with the reason in a tooltip, not a guess. Default commission rate: unavailable until the API exposes it (check `/admin/fees` `GET`, which likely holds it; use that).
  - Tasks (applications, payout accounts, disputes, moderation): reuse the `getNavCounts` approach (share one function so sidebar badges and dashboard rows always match, a spec requirement). Moderation count from `/admin/moderation` list (pending items); permission-gated.
- UI: 6 `StatCard`s in a grid, each inside `SectionBoundary` + `Suspense` with a `CardSkeleton`; "Needs your attention" list with count chip, label, "Open" link to the filtered list (`/applications?status=pending`, `/payouts/accounts?verified=false`, `/disputes?status=admin_review`, `/moderation`). Hide rows with 0 or no permission; show "Nothing needs your attention" if none. Links go to routes not yet built; they will 404 until specs 02-05 land (note in report; do not stub those pages here).
- Compact money via `formatLkrCompact` (exists). Zeros render `0`.
- Polling: a small client wrapper (`TasksPanel`) using TanStack Query `refetchInterval: 60_000` against `/api/dashboard/tasks` (route handler returning counts); the sidebar badge component uses the same endpoint/query key so both update together (replaces the one-shot server fetch in the layout with initial data + polling). Pause when the tab is hidden (`refetchIntervalInBackground: false`).
- Tests: card mapping (MSW fixtures), partial failure (one card fails, others render), task hiding by permission and zero, sidebar/dashboard count parity, axe.

### Step 6. Cross-cutting
- Extend `errors.ts` with `retryAfterSeconds`; unit test.
- Sidebar footer: show real role label and `totp_enabled`; add Sign out.
- `.env.example`/README: note the dev admin setup if Step 0 produced one (no secrets committed).
- E2E (Playwright): un-skip the 403 test if a seeded limited-role admin exists; add login happy path only if a deterministic TOTP is available (otherwise mock the API with MSW at the server level is not practical in Next; keep these as manual steps and say so).
- Quality gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`; report honestly.

## 4. File map (new/changed)

```
src/features/auth/{schemas.ts,actions.ts,components/{login-form,totp-form,totp-setup,recovery-form}.tsx}
src/features/search/{queries.ts,group-results.ts,mask-pii.ts,components/search-result-dialog.tsx}
src/features/dashboard/{queries.ts,tasks.ts,components/{kpi-grid,tasks-panel}.tsx}
src/app/(auth)/login/{page.tsx,2fa/page.tsx,2fa/setup/page.tsx}  src/app/(auth)/lock/page.tsx
src/app/api/search/route.ts   src/app/api/dashboard/tasks/route.ts
src/app/(console)/page.tsx   src/app/(console)/layout.tsx (QueryClientProvider)
src/components/sb/{auth-card.tsx,global-search.tsx,sidebar.tsx(footer/logout)}
src/lib/api/errors.ts  src/lib/auth/{session-options.ts,session.ts,idle.ts}  src/lib/log.ts
src/test/fixtures/*  (+ tests beside each module)
package.json: + qrcode.react
```

## 5. Open questions (defaults in brackets)

1. Dev admin credentials + TOTP for verification? [Needed for Step 0; otherwise build to schema and flag unverified.]
2. Ask the API team for `GET /v1/admin/dashboard` and `GET /v1/admin/counts`? [Yes, recommend; compose from existing endpoints meanwhile.]
3. Admin without 2FA: forced enrolment in this console. [Yes.]
4. Booking/order search result destination. [Read-only dialog, no link out.]
5. Recovery-code link on the 2FA step. [Include.]
6. Realtime (SSE): none exists. [60 s polling only.]
7. Dashboard "Open disputes" vs "Disputes waiting for a decision" definition and week definition (rolling 7 days). [Open = status not resolved; waiting = `admin_review`; rolling 7 days; confirm with product.]

## 6. Done criteria

- An admin can sign in with email/password + TOTP, is forced through enrolment when needed, lands on `next` or `/`, can sign out, and is sent to `/lock` after 30 min idle (unlock via re-login).
- Credentials, codes and partial tokens never appear in URLs, logs, browser storage or client bundles.
- ⌘K / `/` search returns grouped, capped, keyboard-navigable results with all states; query is never logged.
- Dashboard renders six independently failing cards and a role-gated attention list; sidebar badges and task counts match and refresh every 60 s.
- Lint, typecheck, tests, build pass; unverified API mappings are listed explicitly.
