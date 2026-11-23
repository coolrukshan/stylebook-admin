# A-01 Sign-in + 2FA · A-02 Global search · A-03 Dashboard

## A-01 Sign in, 2FA and idle lock (no mockup)

**Purpose / roles:** all admins. Stories: US-A-01. SRS: ADM-01.

Routes: `/login`, `/login/2fa`, `/lock`.

Acceptance criteria:
- Given valid email and password, when submitted, then the API returns a challenge and the user goes to `/login/2fa`.
- Given a valid 6-digit TOTP, when submitted, then tokens are stored in the encrypted httpOnly cookie, and the user lands on the page they asked for (or `/`).
- Given invalid credentials or code, then a generic error shows ("Email, password or code is incorrect"). The message does not reveal which part was wrong.
- Given repeated failures, the API returns 429 or a lockout. Show "Too many attempts, try again in N minutes".
- Given 30 minutes idle, when the user navigates, then they are sent to `/lock`. A TOTP code unlocks it. Three failures sign the user out.
- Given an admin whose 2FA is not enrolled (A-12 shows "Off · reminder sent" for a Moderator), then sign-in must be blocked or forced into enrolment. **Open question.**

States: loading (button pending), error, locked-out. No empty or forbidden state. IP not on the allowlist is handled by the WAF, not the app.

API (proposed): `POST /admin/auth/login`, `POST /admin/auth/2fa`, `POST /admin/auth/refresh`, `POST /admin/auth/logout`, `POST /admin/auth/unlock`.

Open questions:
1. Is 2FA enrolment in scope for this console, or done elsewhere?
2. Can an admin with 2FA off sign in at all?
3. Does `/lock` need the password too, or only TOTP? (Instructions say TOTP.)

## A-02 Global search (mockup A-02)

**Purpose / roles:** all admins. Stories: US-A-02. SRS: ADM-18.

Mockup: a top-bar input with the query "nimal" and a dropdown of 3 results. Each result has a bold title, a muted subtitle, and a type pill on the right.

| Type pill | Title | Subtitle |
|---|---|---|
| User | Nimal Perera | `+94 77 123 4567 · Client` |
| Booking | BK-20931 | `Nimal Perera · RedBox · Tue 27 Oct 10:30` |
| Order | SB-1046 | `Nimal Perera · RedBox shop · paid` |

Entity types searched: users, salons, bookings (BK-), orders (SB-), disputes (DSP-).

Acceptance criteria:
- Given the user presses ⌘K (Ctrl+K on Windows), then the command palette opens focused on the search input. `/` also focuses it (assumption).
- Given 2 or more characters, when the user stops typing for 250 ms, then `/api/search?q=` is called and results show grouped by type.
- Given arrow keys, then focus moves through results. Enter opens the record. Esc closes.
- Given a result is chosen, then the app navigates to that record: user → `/users/[id]`, salon → `/salons/[id]`, dispute → `/disputes/[id]`. Booking and order have **no detail screen** in the console. **Gap:** decide the destination (open the owning user or salon, or a read-only modal).
- Given no results, then show "No matches for "{q}"".
- Given the admin lacks access to an entity type (for example a Moderator and bookings), then those results are excluded by the API.
- Given an ID pattern (`BK-`, `SB-`, `DSP-`), the API matches the exact ID first.

Rules:
- PII in subtitles is masked (see 00 §6). The mockup shows a full phone. Treat as demo.
- Queries are not logged. Searching is not itself an audited reveal.
- Results are capped (assumption: 5 per type, 15 total) with no paging.

States: idle (recent items is a **could**), loading (spinner in input), empty, error ("Search is unavailable"), forbidden (type hidden).

API (proposed): `GET /v1/admin/search?q=&types=` → `[{ type, id, title, subtitle, href_hint }]`. The route handler `/api/search` proxies it with the session token.

## A-03 Dashboard (mockup A-03)

**Purpose / roles:** all admins see the page. Cards and tasks outside a role's permission are hidden (assumption). Stories: US-A-03. SRS: ADM-03.

Layout: title "Platform overview", subtitle "Last 7 days · all countries". Six KPI cards, then the "Needs your attention" list.

| KPI card | Value (demo) | Subtext (demo) |
|---|---|---|
| Active salons | 128 | +6 this week |
| New sign-ups | 1,240 | Clients |
| Bookings | 3,412 | 4.1% no-show |
| GMV | LKR 8.9M | Services + products |
| Commission | LKR 714k | 8% default rate |
| Open disputes | 2 | Oldest 3 days |

"Needs your attention" rows: a count chip, a label and an "Open" link.

| Count (demo) | Label | Links to |
|---|---|---|
| 3 | Salon applications to review | `/applications` |
| 3 | Payout accounts to verify | `/payouts/accounts` |
| 3 | Disputes waiting for a decision | `/disputes` |
| 7 | Reported reviews and AI posts in moderation | `/moderation` |

Acceptance criteria:
- Given a signed-in admin, when `/` loads, then the KPIs show data for the last 7 days from one API call.
- Given a task count is 0, then the row is hidden or shows "All clear" (assumption: hide it, and show "Nothing needs your attention" if all are 0).
- Given the admin lacks permission for a task (for example Finance and moderation), then the row is not shown.
- Given the "Open" link is activated, then the matching list opens with the right filter applied.
- The GMV and Commission figures are API values. The "8% default rate" subtext is the current default commission from the API. The console does not compute any of it.
- Sidebar badges match the task counts (applications, payout accounts, disputes).

Formats: GMV and commission use compact money (`LKR 8.9M`, `LKR 714k`). The API should send exact cents plus a display hint, or the console formats compactly with `Intl.NumberFormat` (`notation: "compact"`).

States: loading (6 card skeletons), partial (a failed card shows "Couldn't load" with retry), empty (new platform: zeros render as 0), error, forbidden n/a.

Real-time: the SSE relay pushes new applications and escalated disputes. Counts and badges update without a reload. A fallback poll every 60 s via TanStack Query.

API (proposed): `GET /v1/admin/dashboard?range=7d` → `{ active_salons{value,delta_week}, signups{value}, bookings{value,no_show_rate}, gmv_cents, commission_cents, default_commission_rate, open_disputes{count,oldest_age_days}, tasks{applications,payout_accounts,disputes,moderation} }`.

Gaps / open questions:
1. Is the "Last 7 days · all countries" header a fixed label or backed by filters? The mockup shows no controls. Assumption: fixed label for v1.
2. Define "Open disputes" (2) vs "Disputes waiting for a decision" (3).
3. "+6 this week" for active salons: is the week rolling 7 days or calendar?
4. The "Clients" subtext on sign-ups: are partner sign-ups excluded?
5. Moderation (7) points to A-11, which has no mockup.
