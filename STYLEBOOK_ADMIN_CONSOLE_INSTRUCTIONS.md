# StyleBook Admin Console — Project Instructions (Next.js)

> The internal console for StyleBook staff: approve salons, verify payout accounts, run payouts, manage users, decide disputes, set fees, moderate content and audit every action.
> Platform: **web only** (desktop, min width 1024). `admin.stylebook.lk` behind WAF and IP allowlist. Not in app stores.
> Stack: **Next.js (App Router) + TypeScript**, separate from the Flutter apps. It talks only to the FastAPI backend.
> Requirements: StyleBook SRS (`ADM-*`, `BR-08`, `BR-09`, `BR-11`, `BR-14`). Backend contract: `/v1/admin/*` in `openapi.json` from the API project. UI reference: prototype board "Admin console (web)" and `STYLEBOOK_FLUTTER_STYLE_GUIDE.md` ("Amber & Ink"). The style guide's tokens are mapped to Tailwind in §3.

---

## 1. Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15+ (App Router, React Server Components, Server Actions), React 19 |
| Language | TypeScript, `strict: true` |
| Package manager | pnpm (pinned in `packageManager`), Node 22 LTS |
| Repo | Own repo `stylebook-admin` (the Flutter apps stay in the Melos monorepo) |
| Styling | Tailwind CSS v4 with the Amber & Ink tokens in `@theme` (§3); `clsx` + `tailwind-merge` (`cn()`) |
| UI components | shadcn/ui on Radix primitives (Dialog, Dropdown, Tabs, Tooltip, Popover, Command), restyled to the tokens |
| Icons | `lucide-react` (1.8 stroke, same set as the apps) |
| Fonts | Manrope 300–800 via `next/font/google` (self-hosted at build) |
| Tables | TanStack Table v8 (server-side sort and paging, column visibility, sticky header) |
| Data fetching | Server Components call the API on the server; TanStack Query v5 only for client-side refresh and polling |
| Mutations | Server Actions (each one checks the role, requires a reason where needed, calls the API, then `revalidatePath`) |
| Forms / validation | React Hook Form + Zod (`@hookform/resolvers`); the same Zod schemas validate Server Action input |
| URL state | `nuqs` for filters, sort and page in the query string (shareable links) |
| API client | `openapi-typescript` (types from `openapi.json`) + `openapi-fetch`; regenerated in CI, never hand-written |
| Auth | Backend-for-frontend: Next.js holds the session. Email + password + TOTP go to FastAPI; the API's tokens are kept server-side in an encrypted, `httpOnly`, `Secure`, `SameSite=Strict` cookie (`iron-session`). Browser JavaScript never sees a token |
| Route protection | `middleware.ts` (no session → `/login`; locked → `/lock`) plus a role check in every layout, page and Server Action |
| Real-time | Server-Sent Events from a Next.js route handler that relays the API WebSocket (new applications, escalated disputes, payout run status) |
| Charts | Recharts (dashboard, re-engagement uplift, reports) |
| Dates / money | `date-fns` + `date-fns-tz` (Asia/Colombo); `Intl.NumberFormat` for LKR from cents |
| Export | CSV and bank files streamed from the API through a route handler (audited by the API) |
| Security headers | CSP (no inline scripts except Next's nonce), HSTS, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` in `next.config.ts` |
| Monitoring | `@sentry/nextjs` with PII scrubbing (`beforeSend` strips emails, phones, account numbers) |
| Quality | ESLint (`next/core-web-vitals`, `typescript-eslint` strict), Prettier, Vitest + Testing Library, Playwright e2e, `@axe-core/playwright` |
| Hosting / CI | Docker (`output: 'standalone'`) on AWS ECS Fargate behind CloudFront + WAF with an IP allowlist; GitHub Actions (lint, typecheck, test, e2e, build, deploy) |

## 2. Folder structure

```
stylebook-admin/
├── src/
│   ├── middleware.ts              # session + idle-lock gate, security headers
│   ├── app/
│   │   ├── layout.tsx             # <html>, Manrope, Toaster, Providers
│   │   ├── globals.css            # Tailwind v4 + @theme tokens (§3)
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx     # A-01 email + password
│   │   │   ├── login/2fa/page.tsx # A-01 TOTP step
│   │   │   └── lock/page.tsx      # idle lock
│   │   ├── (console)/
│   │   │   ├── layout.tsx         # dark sidebar, top bar, global search, role guard
│   │   │   ├── page.tsx           # A-03 dashboard
│   │   │   ├── applications/      # A-04 list + [id]
│   │   │   ├── salons/[id]/       # A-15
│   │   │   ├── payouts/accounts/  # A-05
│   │   │   ├── payouts/runs/      # A-06
│   │   │   ├── users/             # A-07 list + [id]
│   │   │   ├── disputes/          # A-08 list + [id]
│   │   │   ├── fees/              # A-09
│   │   │   ├── reports/           # A-16
│   │   │   ├── engagement/        # A-10
│   │   │   ├── moderation/        # A-11
│   │   │   ├── tickets/           # A-17
│   │   │   ├── catalogue/         # A-18
│   │   │   ├── announcements/     # A-19
│   │   │   ├── roles/             # A-12
│   │   │   └── audit/             # A-13
│   │   └── api/
│   │       ├── events/route.ts    # SSE relay
│   │       ├── export/[kind]/route.ts
│   │       └── search/route.ts    # A-02 typeahead
│   ├── components/
│   │   ├── ui/                    # shadcn/ui primitives (restyled)
│   │   └── sb/                    # Sidebar, TopBar, StatCard, DataTable, StatusPill, ReasonDialog, MaskedValue, EnvBadge
│   ├── features/<area>/           # actions.ts (Server Actions), queries.ts, schemas.ts (Zod), components/
│   ├── lib/
│   │   ├── api/                   # schema.d.ts (generated), client.ts (openapi-fetch, server-only)
│   │   ├── auth/                  # session.ts (iron-session), roles.ts (permission map), require-role.ts
│   │   ├── format.ts              # money from cents, dates in Asia/Colombo
│   │   └── audit.ts               # reason helpers
│   └── test/                      # Vitest setup, MSW handlers
├── e2e/                           # Playwright specs per screen
└── next.config.ts  tailwind (v4: CSS-only)  tsconfig.json  .env.example
```
Rules: anything under `lib/api` and `lib/auth` imports `server-only`. Feature code never calls `fetch` directly; it goes through `lib/api/client.ts`.

---

## 3. Design tokens (Amber & Ink → Tailwind v4)

`src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --font-sans: var(--font-manrope), system-ui, sans-serif;

  /* brand */
  --color-ink: #141414;
  --color-amber: #D9691F;
  --color-amber-dark: #9A4413;
  --color-amber-light: #E07A2E;
  --color-amber-tint: #FBEADB;
  --color-amber-surface: #FFF5EC;
  --color-amber-border: #F1C8A6;

  /* text */
  --color-text: #1A1512;
  --color-text-2: #4A3E36;
  --color-muted: #857469;
  --color-subtle: #A2948A;
  --color-sidebar-text: #ECDFD4;

  /* surfaces and lines */
  --color-background: #F7F0E9;
  --color-surface: #FFFFFF;
  --color-soft: #F4EBE3;
  --color-input: #FFFCF8;
  --color-line: #EEE3D9;
  --color-line-strong: #E7D9CC;

  /* status */
  --color-success: #166534;  --color-success-bg: #DCFCE7;
  --color-warning: #92400E;  --color-warning-bg: #FEF3C7;
  --color-info: #1D4ED8;     --color-info-bg: #E0EAFF;
  --color-danger: #B42318;   --color-danger-bg: #FEE4E2;

  /* shape and depth */
  --radius-pill: 10px;
  --radius-input: 14px;
  --radius-card: 20px;
  --radius-button: 26px;
  --shadow-card: 0 6px 18px rgba(60, 40, 25, 0.06);
  --shadow-primary: 0 8px 18px rgba(20, 16, 12, 0.18);
}

body { @apply bg-background text-text font-sans antialiased; }
```

| Element | Classes / spec |
|---|---|
| Page | `bg-background` with a soft radial glow (`#FBE3CC`) top-right; content padding `px-7 py-6` |
| Sidebar | `w-[220px] bg-gradient-to-b from-ink to-[#1F1C1A] text-sidebar-text`; active item `bg-white/14 text-white font-semibold rounded-[10px]`; count badge `bg-amber text-white` |
| Page title | `text-[27px] font-semibold tracking-[-0.03em]` + subtitle `text-sm text-muted` |
| Card | `bg-surface border border-line rounded-card shadow-card` |
| Primary button | `bg-ink text-white rounded-button h-11 px-5 font-semibold shadow-primary` |
| Secondary button | `bg-surface border border-line-strong rounded-[14px] h-10 px-4 text-[13px] font-semibold` |
| Success action (approve, verify) | `bg-success text-white` |
| Destructive confirm | `bg-danger text-white` (only inside the reason dialog) |
| Status pill | `rounded-pill px-2.5 py-1 text-xs font-semibold` with the status text/bg pair |
| Table | header `text-xs font-semibold text-muted border-b border-line`; rows `border-b border-[#F2E7DE]` |
| Input | `bg-input border border-line-strong rounded-input h-10`; focus `border-amber-light ring-[3px] ring-amber/20` |
| Env badge | `bg-warning-bg text-warning text-xs font-semibold` ("DEMO DATA" / "STAGING") |

shadcn/ui components are generated into `components/ui` and edited to use these tokens. Never use raw hex values in feature code.

---

## 4. Screens

Layout: dark sidebar, cream page, page title with subtitle, environment badge and global search in the top bar. Main actions are black pills; approve and verify use the green success style; destructive confirms are red and live only in the reason dialog.

| ID | Screen | Route | Notes |
|---|---|---|---|
| A-01 | Sign in + 2FA | `/login`, `/login/2fa`, `/lock` | Email, password, 6-digit TOTP; idle lock after 30 min |
| A-02 | Global search | top bar (`/api/search`) | Command palette (⌘K) and dropdown: users, salons, bookings (BK-), orders (SB-), disputes; jumps to the record |
| A-03 | Dashboard | `/` | KPI cards (active salons, sign-ups, bookings, GMV, commission, open disputes), "Needs your attention" tasks with counts |
| A-04 | Salon applications | `/applications`, `/applications/[id]` | List + detail: documents (received / missing), AI document check, map and photos, approve / request info / reject |
| A-05 | Payout accounts | `/payouts/accounts` | Salon, bank and branch, holder (name-mismatch warning), masked account, status; reveal (audited), verify / reject |
| A-06 | Payout run | `/payouts/runs` | Weekly totals, held salons, gross, commission, refunds, net; approve run, export bank file |
| A-07 | Users | `/users`, `/users/[id]` | Search by name, email, phone; type, bookings, joined, status, flags; suspend (reason) / reactivate |
| A-08 | Disputes and refunds | `/disputes`, `/disputes/[id]` | Client · salon, issue, amount, salon reply, status; full refund / 50% / reject (reason); weekly refund stats |
| A-09 | Fees and commission | `/fees` | Service and product commission, default deposit, max no-show fee, AI price, worked example from the API preview, salon overrides, "Save and notify salons" |
| A-10 | Re-engagement | `/engagement` | Stage bars nudged vs holdout, uplift, caps, quiet hours, holdout % |
| A-11 | Moderation | `/moderation` | Reported reviews and AI posts: keep, hide, warn salon |
| A-12 | Admin roles | `/roles` | Permission matrix (Super admin locked to all), admin list with role, 2FA status, last active |
| A-13 | Audit log | `/audit` | Append-only: when, admin, action (with reason), IP; filter and export |
| A-14 | Reason dialog | `components/sb/ReasonDialog` | Radix Dialog: title, consequence note, required preset reasons, cancel / red confirm; passes the reason to the Server Action |
| A-15 | Salon detail | `/salons/[id]` | Branches, staff, services, bookings, complaints; suspend, close, feature on home; read-only "view as salon" |
| A-16 | Financial reports | `/reports` | GMV, commission, refunds, payouts by period and salon; CSV |
| A-17 | Support tickets | `/tickets` | Tickets from clients and salons: assign, reply, close |
| A-18 | Catalogue and platform settings | `/catalogue` | Categories, brands, home banners, cancellation defaults, AI credit limits |
| A-19 | Announcements | `/announcements` | Push or email to segments, preview and schedule |

---

## 5. User stories

Format: **As a** role, **I want** …, **so that** …. Roles: **Super admin**, **Support**, **Finance**, **Moderator** (permissions set in A-12). Priority M = must, S = should, C = could.

### 5.1 Access and navigation

| ID | Story | Screens | SRS | Pri |
|---|---|---|---|---|
| US-A-01 | As an admin, I want to sign in with password and 2FA, and be locked out after 30 idle minutes. | A-01 | ADM-01 | M |
| US-A-02 | As an admin, I want one search box (and ⌘K) for users, salons, bookings, orders and disputes that jumps to the record. | A-02 | ADM-18 | M |
| US-A-03 | As an admin, I want a dashboard with platform KPIs and a list of what needs attention. | A-03 | ADM-03 | M |
| US-A-04 | As a super admin, I want to grant or remove permissions per role, with every change logged. | A-12, A-13 | ADM-02, ADM-23 | M |
| US-A-04a | As any admin, I want to see only the menu items and actions my role allows. | all | ADM-23 | M |

### 5.2 Salons and money

| ID | Story | Screens | SRS | Pri |
|---|---|---|---|---|
| US-A-05 | As support, I want to review a salon's documents with an AI check before it goes live. | A-04 | ADM-05 | M |
| US-A-06 | As support, I want to approve, request info or reject; request info and reject need a reason the owner sees. | A-04, A-14 | ADM-05, ADM-19 | M |
| US-A-07 | As finance, I want to verify payout accounts and see when a name doesn't match the business. | A-05 | ADM-07 | M |
| US-A-08 | As finance, I want account numbers masked, with every reveal written to the audit log. | A-05, A-13 | ADM-07, ADM-16 | M |
| US-A-09 | As finance, I want to approve the weekly payout run and export the bank file; salons with unverified accounts are held. | A-06 | ADM-09 | M |
| US-A-10 | As finance, I want to set commission on services and products (never tips), default deposit, max no-show fee and AI price, with a worked example. | A-09 | ADM-21, BR-11 | M |
| US-A-11 | As finance, I want salon-level fee overrides with an end date (e.g. 0% for new salons for 60 days). | A-09 | ADM-08, ADM-21 | S |
| US-A-19 | As support, I want a salon's full detail and to suspend, close or feature it (with a reason). | A-15, A-14 | ADM-06 | M |
| US-A-20 | As support, I want to view a salon's app read-only, with a banner and an audit entry, to help them. | A-15 | ADM-17 | C |
| US-A-21 | As finance, I want reports by period and salon with CSV export. | A-16 | ADM-15 | M |

### 5.3 Users, disputes, content

| ID | Story | Screens | SRS | Pri |
|---|---|---|---|---|
| US-A-12 | As support, I want to find a user by name, email or phone and see their bookings and reports. | A-07 | ADM-04 | M |
| US-A-13 | As support, I want to suspend a user only with a reason, and reactivate them later. | A-07, A-14 | ADM-04, ADM-19 | M |
| US-A-14 | As support, I want escalated disputes (salon didn't solve in 48 h) with both sides' messages. | A-08 | ADM-10, ADM-20, BR-09 | M |
| US-A-15 | As support, I want to refund in full, 50%, or reject with a reason; refunds come out of the salon's next payout. | A-08, A-14 | BR-08, BR-09 | M |
| US-A-16 | As a moderator, I want to review reported reviews and AI posts and hide them. | A-11 | ADM-11 | S |
| US-A-22 | As support, I want to handle tickets from clients and salons. | A-17 | ADM-22 | S |

### 5.4 Platform

| ID | Story | Screens | SRS | Pri |
|---|---|---|---|---|
| US-A-17 | As a super admin, I want to tune the re-engagement engine and see uplift against the holdout group. | A-10 | ENG-* | S |
| US-A-18 | As any admin, I want an append-only audit log I can filter and export. | A-13 | ADM-16 | M |
| US-A-23 | As a super admin, I want to manage categories, brands, home banners, cancellation defaults and AI credit limits. | A-18 | ADM-12, ADM-13 | M |
| US-A-24 | As a super admin, I want to send announcements to a segment. | A-19 | ADM-14 | S |

---

## 6. Auth and data flow

```
Browser ──(httpOnly session cookie)──▶ Next.js server ──(Bearer access token)──▶ FastAPI /v1/admin/*
```

1. `/login` posts email + password to a Server Action → `POST /admin/auth/login` → API returns a short-lived challenge.
2. `/login/2fa` posts the TOTP code → `POST /admin/auth/2fa` → API returns access (15 min) and refresh tokens and the admin's role and permissions.
3. Next.js stores them in the encrypted `iron-session` cookie (`httpOnly`, `Secure`, `SameSite=Strict`, `path=/`). Nothing goes to `localStorage` or to client components.
4. `lib/api/client.ts` (server-only) adds the access token, refreshes it on `401` once, and forwards `X-Request-Id` and `Idempotency-Key` for writes.
5. Idle lock: `lastActive` is kept in the session; `middleware.ts` sends you to `/lock` after 30 minutes, and unlocking needs a TOTP code.
6. Role checks: `requireRole('finance')` in layouts, pages and every Server Action. The sidebar is built from the same permission map. The API re-checks everything.

---

## 7. Rules for building

- **Git & Branching Preconditions**: Before starting any new development or task, verify `git status`. If uncommitted changes are present, ask the user to commit and push them before proceeding. Always create and switch to a dedicated feature branch (e.g. `feature/<name>`) from `main` before authoring code.
- **Design**: follow `STYLEBOOK_FLUTTER_STYLE_GUIDE.md` through the Tailwind tokens in §3. Dark sidebar, cream pages, black pill actions, orange only for accents. Never use raw hex values or one-off shadows in feature code.
- **Server first**: pages are Server Components that load data on the server. Add `"use client"` only for interactive pieces (tables, dialogs, forms, charts).
- **Mutations** go through Server Actions validated with Zod. Every write except a pure approval opens the reason dialog (A-14) and sends `reason` to the API, which writes the audit row. Destructive confirms are red.
- **No secrets in the browser**: API base URL, tokens and session keys live in server env vars only (no `NEXT_PUBLIC_` for any of them).
- PII is masked by default (phone and email partially, account numbers fully); reveals call the API and are audited. Never log PII on the server or the client.
- Tables: server-side paging and sort through the API; filters, sort and page in the URL with `nuqs` so links can be shared.
- The API is the source of truth for fees, refunds and payout totals; the console never computes them (worked examples come from the API preview endpoint).
- Types come from `openapi.json` only. Regenerate with `pnpm api:gen`; CI fails if the generated file is out of date.
- Money is formatted from cents: `LKR 1,500`. Dates as "Thu 29 Oct, 9:30 AM"; audit times show the time zone.
- Accessibility: full keyboard use for tables, dialogs and the command palette, visible focus ring, labels on icon buttons, no information by colour alone; axe checks pass in e2e.

## 8. Build order

1. Project setup: tokens (§3), shadcn/ui, auth flow (§6), middleware, sidebar shell, A-01, A-03, A-13
2. A-04, A-05, A-06 (salons go live and get paid)
3. A-07, A-08, A-14 (users and disputes)
4. A-02, A-09, A-12 (search, fees, roles)
5. A-15, A-16, A-18 (salon detail, reports, settings)
6. A-10, A-11, A-17, A-19 (engagement, moderation, tickets, announcements)

## 9. Definition of done (per screen)

Matches the prototype board "Admin console (web)" · Tailwind tokens only · role guard tested for each role (page and Server Action) · audit reason sent for each write (asserted in Vitest with MSW) · Playwright e2e for the main path, including keyboard-only · axe: no serious issues · works at 1024 px and 1440 px · no PII in logs or Sentry events · `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm e2e` pass in CI.
