# Plan 00: Shared foundation (shell, roles, formats, states, ReasonDialog, PII, audit)

Spec: `_specs/00-shared.md`. API: `http://localhost:8000` (OpenAPI at `/openapi.json`, "StyleBook API 0.1.0").
Branch: `feature/project-setup` (already off `main`; nothing committed yet). Do not commit unless asked.

This plan builds everything the screen specs 01–09 depend on. No screen-specific logic here.

## 0. Current state (verified)

- Present: Next 16.4.6, React 19.3, Tailwind 4 tokens in `src/app/globals.css` (Amber & Ink, Manrope), shadcn (base-nova, **Base UI**, not Radix) primitives: button, dialog, badge, table, tabs, input, input-group, select, textarea, popover, sheet, tooltip, command, dropdown-menu, separator. Root layout with `TooltipProvider`.
- Missing: everything under `src/app/(auth)`, `(console)`, `src/components/sb`, `src/features`, `src/lib/{api,auth}`, tests, scripts (`api:gen`, `typecheck`, `test`), `.env.example`, `vitest`/`playwright` config.
- `package.json` has no `vitest.config`, no `test`/`typecheck`/`api:gen` scripts. Playwright, `@axe-core/playwright` and `@tanstack/react-table` v9 (note: spec says v8) are partly absent or different.

## 1. Findings that change the spec (decide before coding)

| # | Finding | Impact / proposed handling |
|---|---|---|
| 1 | Next 16 renamed `middleware` to **`proxy.ts`** (`export function proxy`). | Idle-lock and auth redirect go in `src/proxy.ts`. Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` and the `getting-started/proxy` guide first; note it must not rely on shared modules/globals. |
| 2 | **No `GET /v1/admin/counts`** exists. | Sidebar badges (applications, payout accounts, disputes) must be derived: call the three list endpoints with `limit=1`/status filter, or ship without badges until the API adds counts. Isolate in one `getNavCounts()` query so swapping is a one-file change. **Needs API team decision.** |
| 3 | Permissions are **strings** in `GET /v1/admin/me` (`role`, `permissions: string[]`), not only a role matrix. | `roles.ts` should check `permissions.includes(key)` from the API, with the spec's matrix only as a typed key list and test fixture. Confirm actual key names against a real `/admin/me` response (spec keys are "proposed"). |
| 4 | Admin token is a **60 min JWT, audience "admin"**; login returns `{access_token, requires_totp, partial_token, totp_setup_required, totp_uri, totp_secret}`; TOTP is `POST /admin/auth/totp {partial_token, totp_code(6)}`. No refresh endpoint for admin. | Session cookie lifetime = token life. Idle lock (30 min) is a console-side state; on token expiry redirect to `/login`, not `/lock`. `/lock` unlock = re-verify TOTP; check whether the API supports re-auth with an existing token (likely not, so unlock may need `partial_token` flow). **Open question.** |
| 5 | Reasons: `suspend` needs `reason` min 5 / max 1000; payout reveal `reason` min 3 (default "Verify bank details"); applications `DecisionIn.reason` optional; there are `ReasonIn` / `OptionalReasonIn` schemas. API has **no `reason_code`**. | ReasonDialog sends only `reason` (the label, or the free text for Other). Spec's `reason_code` is dropped unless the API adds it. Spec's "Other" min 10 chars is stricter than API: keep 10 in UI. |
| 6 | Reveal endpoint exists only for **bank account** (`/payout-accounts/{id}/reveal`). No email/phone reveal (`pii.revealed`). | `MaskedValue` supports bank-account reveal now; email/phone reveal is unavailable, so show masked only until the API adds it. API returns the full number in one response, so masking of non-last-4 must happen in the UI for the list view (confirm list returns a pre-masked value). |
| 7 | List endpoints use **cursor pagination** (`cursor`, `limit`, `next_cursor`). | `DataTable` pagination is cursor-based (next/prev via nuqs `cursor` stack), not page numbers. |
| 8 | Errors are `{code, message, field}` (UPPER_SNAKE_CASE); the spec's `X-Request-Id` and `Idempotency-Key` headers are not in the schema. | Still send both headers (harmless, per spec). Map `code` to UI behaviour (409 stale, 403 forbidden, 422 field errors, 429 rate-limit). Verify the API echoes `X-Request-Id`; if not, generate one client side and show that. |
| 9 | shadcn here is **Base UI**, not Radix. | `ReasonDialog` builds on `components/ui/dialog.tsx` (Base UI Dialog). Focus trap/return are built in; verify "first chip focused on open" via `initialFocus`. Update the `dev` agent note if it keeps saying Radix. |
| 10 | TanStack Table is **v9** in `package.json`. | Read the v9 skill docs (`getting-started`) before writing `DataTable`; the API differs from v8. |
| 11 | The existing `.claude/agents/dev.md` says "Run `git status`; branch from main". We are already on `feature/project-setup`. | Continue on it. |

## 2. Work breakdown (ordered; each step ends green on lint + typecheck)

### Step 1. Tooling and scripts
- Add scripts: `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `test:e2e` (`playwright test`), `api:gen` (`openapi-typescript $API_URL/openapi.json -o src/lib/api/schema.d.ts`), `api:check` (regen + `git diff --exit-code`).
- Install missing dev deps: `@playwright/test`, `@axe-core/playwright`, `jsdom`. Add `vitest.config.ts` (jsdom, `@` alias, setup file with jest-dom), `playwright.config.ts`.
- `.env.example`: `API_BASE_URL=http://localhost:8000`, `SESSION_SECRET` (32+ chars), `NEXT_PUBLIC_ENV_LABEL` (`DEMO DATA` | `STAGING` | empty). Server-only env validated by a Zod `src/lib/env.ts`.
- Run `pnpm api:gen`; commit generated `schema.d.ts` (per project rule). Fix `@types/node` to match Node 22.

### Step 2. API client (`src/lib/api/`)
- `client.ts` (`import "server-only"`): `openapi-fetch` client, base URL from env, middleware that injects `Authorization: Bearer <session token>`, `X-Request-Id` (uuid), and `Idempotency-Key` on non-GET.
- `errors.ts`: `ApiError {status, code, message, field, requestId}`; `toActionResult()` helper returning a discriminated `{ok:true,data}|{ok:false,error}` for Server Actions. Strip PII from messages shown to users (show `code`-mapped copy, never raw `message` for 4xx with user data).
- `nav-counts.ts`: finding #2.
- Tests: client middleware sets headers; error mapping for 401/403/409/422/429/500 (MSW).

### Step 3. Auth/session/roles (`src/lib/auth/`)
- `session.ts`: iron-session (httpOnly, secure in prod, sameSite=lax) storing `{accessToken, partialToken?, adminId, lastActiveAt}`.
- `permissions.ts`: typed `PermissionKey` union from spec §2 (assumptions flagged `*` in comments), `hasPermission(me, key)`.
- `require-role.ts`: `requirePermission(key)` for pages and Server Actions. Throws `forbidden()`/renders 403 (check the Next 16 docs for the current forbidden/unauthorized convention before choosing; it may be experimental). Unauthenticated redirects to `/login`.
- `getCurrentAdmin()` cached per request (`React.cache`) around `GET /v1/admin/me`.
- `src/proxy.ts`: no session redirects to `/login`; session older than 30 min idle redirects to `/lock?next=…`; touch `lastActiveAt` on navigation. Matcher excludes `_next`, static, `/login`, `/lock`. Keep it free of shared modules/globals (docs warning).
- Auth screens themselves (A-01 login, 2FA, lock) belong to spec 01; this step ships only the session plumbing and thin stubs needed for tests.
- Tests: `hasPermission`, `requirePermission` (allowed, forbidden, anonymous), proxy idle logic (pure function extracted and unit-tested).

### Step 4. Formatting (`src/lib/format/`)
- `money.ts`: `formatLkr(cents)` -> `LKR 1,500`; `formatLkrCompact(cents)` -> `LKR 8.9M`, `LKR 714k` (display only; cents are integers, divide by 100 for display only). `Intl.NumberFormat("en-LK")`; no floating drift, use integer math before formatting.
- `date.ts` (date-fns-tz, `Asia/Colombo`): `formatDateTime` ("Thu 29 Oct, 9:30 AM"), `formatMonthYear` ("Feb 2026"), `formatAuditTime` (always with zone abbreviation, e.g. "… IST"), `formatRelative` (from API timestamp).
- `ids.ts`: IDs shown as given (BK-, SB-, DSP-); mono-font helper class.
- `percent.ts`: whole numbers unless decimals supplied.
- Tests: boundary cases (0, 150 cents, 100,000,000 cents, DST-free Colombo offset +05:30, midnight crossing, UTC input).

### Step 5. Shell components (`src/components/sb/`)
Server Components unless noted. Tokens only, no raw hex.
- `Sidebar` (220px, `from-ink`): items per spec §1 order; items filtered by permissions; active highlight via a small client `NavLink` (`usePathname`); amber `CountBadge`; footer with name, role text, "2FA on · session locks after 30 min idle". Nav config in `src/components/sb/nav-config.ts` (label, href, icon, permission, optional badge key); appended assumed entries (Reports, Moderation, Tickets, Catalogue, Announcements) role-gated after Re-engagement.
- `TopBar`: title/subtitle props, `EnvBadge` (from env label; absent in prod), `GlobalSearch` trigger (client; wires to spec 01's command palette via `cmdk`; shell only here, no search logic).
- `(console)/layout.tsx`: calls `getCurrentAdmin()`, renders Sidebar + main; desktop min-width 1024px (below it show a "use a larger screen" notice). Streams via `Suspense` for badge counts so layout never blocks.
- `StatCard`, `StatusPill` (variants success/warning/danger/info; always icon+text; maps from status strings in a single `STATUS_MAP`), `DataTable` (TanStack v9, cursor pagination via nuqs, sticky header, row action `aria-label` includes subject, empty state), `MaskedValue` (client; Reveal/Hide, 60 s auto-hide, clears on unmount/navigation, value only in state), `PageHeader`.

### Step 6. Screen states (every screen)
- `loading.tsx` skeleton helpers: `CardSkeleton`, `TableSkeleton` (`src/components/sb/skeletons.tsx`).
- `ErrorCard` (client, retry via `router.refresh()` / `reset`, shows `X-Request-Id`); `error.tsx` boundaries in `(console)` and per-section wrapper `SectionBoundary` for partial-data cards ("Couldn't load" + retry).
- `EmptyState` (message + optional clear-filters link).
- `forbidden.tsx`/403 page ("You don't have access to this area"), `not-found.tsx`.
- Stale (409): action helper maps `409` to a toast "This was already handled by <admin>" (if the error carries it; else generic) + `router.refresh()`. Action 403: toast + refresh.
- Toasts: add shadcn `sonner` (or equivalent for this style); mount in root layout.
- Idle lock: `/lock` route (stub from step 3) restores `next` param after unlock.

### Step 7. ReasonDialog (A-14) (`src/components/sb/reason-dialog.tsx`, client)
- Props: `title`, `note`, `presets: {code, label}[]`, `confirmLabel`, `tone: "danger"|"neutral"`, `ownerVisible?: boolean`, `onConfirm(reason): Promise<ActionResult>`, trigger via render-prop/`children`.
- Behaviour: single-select chips with check icon + `aria-pressed` (not colour only); "Other" reveals required textarea (10–500 chars; React Hook Form + Zod); confirm disabled until valid; pending state blocks double submit; error from action shown inline; Esc/Cancel send nothing; focus trap, return focus to trigger, first chip focused on open; `ownerVisible` shows "The owner will see this".
- `reason-presets.ts` holding the five dialogs from spec §5 (reject salon, request info, reject payout account, reject dispute, suspend user) plus a neutral reactivate config (assumption, open question in 04).
- Sends `reason` (label or free text) only; `reason_code` kept in the type for forward compatibility but not sent (finding #5).
- Tests (Testing Library): disabled until chosen; Other requires 10 chars; Esc sends nothing; double-click submits once; axe has no violations.

### Step 8. Audit and PII plumbing
- Server Action wrapper `withAudit`/`runAdminAction({permission, call})`: runs `requirePermission`, calls API with idempotency key (stable per form open, not per click, so a timeout retry reuses it), returns `ActionResult`. This is what every later screen's actions use.
- Never log request bodies or search queries; add a lint-level comment plus a unit test that the logger redacts known PII fields. No Sentry yet, but document the scrub rule.
- Reveal action contract for `MaskedValue`: Server Action `revealBankAccount(accountId, reason)` -> returns the value to the client component only; never cached (`cache: "no-store"`).

### Step 9. Tests and quality gates
- Unit (Vitest): format, permissions, require-role, API client/errors, proxy logic, idle logic.
- Component (Testing Library + MSW): Sidebar (permission filtering, badges, active state), StatusPill, MaskedValue (reveal/auto-hide/unmount), ReasonDialog, ErrorCard, DataTable empty/cursor.
- E2E (Playwright, later once screens exist; this plan only sets the config and one smoke test: unauthenticated -> `/login`; forbidden route -> 403 page) with `@axe-core/playwright`.
- Finish with `pnpm lint`, `pnpm typecheck`, `pnpm test`; report failures honestly.

## 3. File map (new)

```
src/proxy.ts
src/lib/env.ts
src/lib/api/{client.ts,errors.ts,nav-counts.ts,schema.d.ts(generated)}
src/lib/auth/{session.ts,permissions.ts,require-role.ts,current-admin.ts}
src/lib/format/{money,date,ids,percent}.ts (+ *.test.ts)
src/lib/actions/run-admin-action.ts
src/components/sb/{sidebar,nav-link,nav-config,top-bar,env-badge,global-search,stat-card,status-pill,data-table,masked-value,page-header,skeletons,error-card,empty-state,section-boundary,reason-dialog,reason-presets}.tsx
src/app/(console)/{layout.tsx,error.tsx,forbidden.tsx,loading.tsx}
src/app/(auth)/{login,lock}/page.tsx   (stubs only; real screens in spec 01)
vitest.config.ts  playwright.config.ts  .env.example
```

## 4. Open questions (need an answer; defaults in brackets)

1. Nav counts: will the API add `GET /v1/admin/counts`? [No: derive from list endpoints, hide badge on failure.]
2. Exact permission key strings returned by `/admin/me`. [Inspect a real response once seeded; map spec keys to them.]
3. Does the API support lock/unlock (re-auth with TOTP while the token is valid)? [Unlock via full re-login if not.]
4. Should API add `reason_code` and email/phone reveal endpoints? [Drop `reason_code`; masked-only for email/phone.]
5. Is `X-Request-Id` echoed and `Idempotency-Key` honoured server-side? [Send both; generate request id locally if not echoed.]
6. Sonner for toasts OK? [Yes.]

## 5. Done criteria

- `/` redirects by auth state; console layout renders the sidebar filtered by role from a real `/admin/me`.
- A Server Action using `runAdminAction` rejects a user without the permission server-side.
- ReasonDialog, MaskedValue, StatusPill, DataTable, ErrorCard/EmptyState/skeletons are usable by later specs with no raw hex and passing axe.
- `pnpm api:gen` works against `localhost:8000`; lint, typecheck and tests pass; nothing committed.

## 6. Suggested sequencing for the `dev` agent

Steps 1–2 → 3–4 (parallelisable) → 5–6 → 7 → 8 → 9. Hand off to `code-reviewer` after step 7, then continue with `_specs/01-access-dashboard-search.md`.
