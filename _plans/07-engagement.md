# Plan 07: Re-engagement (A-10)

Spec: `_specs/07-engagement.md`. Mockup: `admin/A-10_re_engagement.png`.
API: `http://localhost:8000` (down when this plan was written). Facts below come from `src/lib/api/schema.d.ts` and the backend source `../StylebookAPI/app/modules/engagement/` (HEAD `9f7a658`, with uncommitted changes, so the running API may differ).
Depends on plans 00 to 06 (on `main`). Branch: `feature/engagement` (created from `main`). Do not commit unless asked.

## 0. What already exists

`StatCard`, `SectionBoundary`, `ErrorCard`, `EmptyState`, skeletons, `runAdminAction`, `requirePermission`, `useActionErrorHandler`, `formatPercent`, console permission `engagement.edit` (-> `engagement.manage`), nav item `/engagement`. `ReasonDialog` takes preset chips plus "Other" (10 to 500 chars), which fits the API's reason limit (3 to 500).

## 1. API findings that change the spec

| # | Finding (source) | Handling |
|---|---|---|
| 1 | Only `GET /v1/admin/engagement/stats?period=7d\|30d\|90d` and `POST /v1/admin/engagement/holdout/reset`. **No settings endpoint**, no `PATCH`. | Fixed 30 days (spec). Engine settings card is read-only with "Not available yet" (see 6). |
| 2 | Stats: `total_nudges_sent / opened / converted`, `overall_open_rate`, `overall_conversion_rate`, `holdout_group {size, organic_return_rate, treatment_return_rate, lift}`, `top_salons_by_conversion[]`. Rates are fractions (0 to 1). Conversion = completed booking at the same salon within 14 days. | Rates are formatted as percentages (x100 is display formatting only, 1 decimal at most). |
| 3 | **No per-stage data** (Due soon, Overdue, At risk, Lapsed) in the admin stats. | The chart shows one "All stages" block: Nudged vs Holdout bars from `treatment_return_rate` and `organic_return_rate`, with sent count and open rate. Spec subtitle kept; title changed to "Rebooking: nudged vs holdout" so it does not claim a lift "at every stage". Per-stage blocks are a gap. |
| 4 | `lift` is **relative** ((nudged − holdout) / holdout), not percentage points. It is 0 when the holdout rate is 0. | Show it as "+X% relative lift", never as "pts", and never compute a points difference. If `size` is 0 show "No holdout, uplift unavailable"; else if `organic_return_rate` is 0 show "Uplift unavailable (no holdout bookings yet)". |
| 5 | No extra-bookings estimate and no opt-out rate. | KPI cards: "Nudges sent · 30 days" (real; sub-line "Holdout group: N clients"), "Extra bookings vs holdout" and "Opt-out rate" show "Not available yet". |
| 6 | Thresholds, caps, quiet hours, channels and model are not exposed. The backend constants also differ from the mockup (caps 1 per 14 days per salon, 3 per 30 days, 500 per salon per day; send window 09:00 to 21:00). | Do not hard-code backend constants into the console (they would drift). Settings rows keep their labels with "Not available yet". Report the differences. |
| 7 | **Holdout "change" is a reset:** it deletes the whole holdout group and all assignments, and re-randomises eligible clients with a new seed, every time, even at the same percentage. Range **1 to 50** (0 not allowed). Body `{holdout_percentage, reason}`; response `{previous_holdout_size, new_holdout_size, holdout_percentage}`. Audit `engagement.holdout_reset`. | UI is an explicit **"Reset holdout group"** action, not an auto-saving stepper: percentage input (1 to 50, default 10) then a reason dialog with a destructive warning. Toast shows old and new sizes. |
| 8 | **The current percentage cannot be read, and appears not to be stored**: the engine is built with the default 10% (and default seed), so clients first seen after a reset are drawn at 10% whatever was chosen. | Do not display a "current holdout %". State in the dialog: "The percentage applies to clients eligible now. Clients who become eligible later are drawn at the engine's default." Report to the API team as a likely bug (open question 1). |
| 9 | Permissions: `engagement.read` to view, `engagement.manage` to reset. The router also has an admin IP allow-list (403 `IP_NOT_ALLOWED`). | Add console key `engagement.view` (`engagement.read` or `engagement.manage`); page and nav use it. Reset needs `engagement.edit`. For a 403 on the stats call show "You don't have access to engagement data from this network or role" in the section card. |

## 2. Step 0: verify with a running API

When the API is up: read stats with an admin holding `engagement.read`; **do not call the reset on anything but throwaway data** (it re-randomises the group). Capture synthetic fixtures. If it stays down or there are no credentials, say so in the report.

## 3. Work breakdown

### Step 1. Permissions
- Add `engagement.view` to `PERMISSION_KEYS` and `API_PERMISSIONS`; extend the table-driven test. `nav-config.ts`: `/engagement` uses `engagement.view`.

### Step 2. Feature module (`src/features/engagement/`)
- `schemas.ts` (Zod): `statsSchema` (non-negative integers, rates 0 to 1, lift any number), `resetInputSchema` (integer 1 to 50, reason 3 to 500).
- `display.ts` (pure, tested): `formatRate(0.314)` -> "31.4%"; `barWidth(rate)` clamped 0 to 100; `upliftState(holdout)` -> `{kind: "no_holdout"|"no_baseline"|"lift", text?}`; `formatLift(0.29)` -> "+29% relative lift"; no arithmetic between the two arms.
- `queries.ts` (server, `React.cache`): `getEngagementStats()` (period `30d`).
- `actions.ts` (`"use server"`, async declarations only): `resetHoldout(percentage, reason, key)` (`engagement.edit`, audit name `engagement.holdout_reset`, returns the three response fields, `revalidatePath("/engagement")`). Reason never logged.
- Tests: formatting and edge states, schema bounds, action validation, permission and body.

### Step 3. Screen (`src/app/(console)/engagement/`)
- `page.tsx`: `requirePermission("engagement.view")`, `TopBar` "Re-engagement" / "Win-back notifications measured against a holdout group". KPI cards and chart share one stats fetch but sit in their own `SectionBoundary` + `Suspense`, so the settings card renders even if stats fail. `loading.tsx`, `error.tsx`.
- Empty: `total_nudges_sent === 0` -> chart shows "No nudges sent in the last 30 days" (KPI shows 0).

### Step 4. Components
- `KpiCards`: three `StatCard`s (finding 5).
- `RebookingChart` (Server Component, CSS bars, no Recharts needed for two bars): legend text "Nudged" and "Holdout" on each bar with its value (not colour alone), tokens only (`bg-ink`, tan token), uplift line (finding 4), sent and open rate, and a visually hidden data table with the same numbers.
- `SettingsCard`: the six spec rows with "Not available yet"; the holdout row shows the group size and, with `engagement.edit`, the reset control.
- `HoldoutReset` (client): number input with − / + (1 to 50), "Reset holdout group" button opening `ReasonDialog` (`reasonDialogs.resetHoldout(pct)`: title, destructive warning including the finding 8 sentence and "The comparison restarts from today; earlier holdout results are no longer comparable.", presets "Change holdout size", "Restart the measurement", "Holdout group is unbalanced", Other; confirm "Reset holdout"; tone danger). Success toast "Holdout reset: {previous} -> {new} clients"; 409/403 via the shared handler. Invalid percentage disables the button.

### Step 5. Cross-cutting
- `reason-presets.ts`: add `resetHoldout`, marked ASSUMPTION (spec open question 1).
- Logging: numbers and action names only.

### Step 6. Tests and quality gates
- Component (Testing Library): KPI values and placeholders, chart labels, widths and hidden table, the three uplift states, empty state, settings rows, reset hidden without `engagement.edit`, stepper bounds 1 and 50, dialog sends percentage and reason once, failure keeps the dialog open, axe.
- Finish with `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, run the app and smoke-test the signed-out redirect for `/engagement`. Report honestly.

## 4. File map (new/changed)

```
src/features/engagement/{schemas.ts,display.ts,queries.ts,actions.ts}
src/features/engagement/components/{kpi-cards,rebooking-chart,settings-card,holdout-reset}.tsx
src/app/(console)/engagement/{page.tsx,loading.tsx,error.tsx}
src/lib/auth/permissions.ts (+ test)   src/components/sb/{nav-config.ts,reason-presets.ts}
(+ tests beside each module)
```

## 5. Open questions (defaults in brackets)

1. Is the reset percentage meant to persist for newly eligible clients? It appears not to. Should the console offer the reset before that is fixed? [Offer it with truthful warning text; product owner may prefer to hide it.]
2. API to add per-stage stats, extra-bookings estimate, opt-out rate and a read endpoint for engine settings and current holdout percentage. [Shown as "Not available yet".]
3. Which caps and quiet hours are correct, the mockup's or the backend's? [Show neither.]
4. Date range selector (the API supports 7, 30 and 90 days) and the top-salons list it returns. [Not built; spec asks for 30 days only.]
5. Engine on/off switch (spec Q4). [Not supported by the API.]

## 6. Done criteria

- Admins with `engagement.read` see `/engagement` with real nudge, open-rate and nudged-versus-holdout numbers; others get the 403 page and no nav item.
- Nothing is calculated between the two arms in the console, relative lift is labelled as such, and the no-holdout and no-data states are clear.
- Resetting the holdout requires `engagement.manage`, a percentage from 1 to 50, a reason and an explicit confirm that states what is destroyed.
- Unavailable data is labelled, not invented or hard-coded.
- Lint, typecheck, tests and build pass; every API gap is listed in the report.
