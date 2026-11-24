# Plan 05: Disputes and refunds (A-08, with A-14 reject)

Spec: `_specs/05-disputes.md`. Mockups: `admin/A-08_disputes_and_refunds.png`, `admin/A-14_reason_reject_dispute.png`.
API: `http://localhost:8000` (`src/lib/api/schema.d.ts`; re-run `pnpm api:gen` first and commit any diff).
Depends on plans 00 to 04 (on `main`). Branch: `feature/disputes` (created from `main`). Do not commit unless asked.

## 0. What already exists

`ReasonDialog` + `reasonDialogs.rejectDispute` (labels and note match the spec), `StatusPill` (`admin_review` -> "Needs decision" danger, `salon_review` -> "Salon has 48 h" warning, `resolved`, `rejected`, `open` mapped), `StatCard`, `runAdminAction`, `requirePermission`, `formatLkr`, `formatDateTime`, `formatRelative`, `EmptyState`, `ErrorCard`, `SectionBoundary`, skeletons, `useActionErrorHandler`. `getNavCounts` already counts `status=admin_review` for the sidebar badge. Lessons from earlier plans: keep `DataTable` columns stable; `"use server"` files may only export async function declarations (the build catches it, so build before reporting).

## 1. API findings that change the spec

| # | Finding | Handling |
|---|---|---|
| 1 | Admin API has only `GET /v1/admin/disputes` (`status`, `salon_id`, `cursor`, `limit`) and `POST /v1/admin/disputes/{id}/decide`. **No stats, no refund-preview, no admin detail.** | Detail uses the shared `GET /v1/disputes/{id}` (documented "client owner, salon owner, or admin"). Whether it accepts the admin token is **unverified** (Step 0). If it rejects, the detail page falls back to the list item. Stats cards render "Not available yet" (see 5). |
| 2 | `DisputeOut`: `id, booking_id, order_id, user_id, salon_id, status (open\|salon_review\|admin_review\|resolved\|rejected), category, reason, evidence_urls[], salon_response, salon_responded_at, offer_refund, offered_refund_cents, admin_decision, admin_reason, salon_deadline, created_at, resolved_at`. **No dispute code (DSP-118), no client or salon name, no amount.** | Case shows the short id (first 8 chars, mono) labelled as an ID, never an invented `DSP-` code. Client and salon names are looked up from `/admin/users/{id}` and `/admin/salons/{id}`, deduplicated per request and cached with `React.cache`, with `Promise.allSettled` so a failed lookup shows "Unknown". Client name is shortened ("Tharindu J.") in a pure helper; no contact data is fetched into props. Page size 20 to bound the lookups. Gap: the API should return names, a code and the amount on the list. |
| 3 | **The disputed amount is not in the API** (`DisputeOut` has none; the booking total is not reachable from an admin endpoint). | Amount column shows "-" with the salon's offer when `offer_refund` is true ("Offered LKR 1,000"). Never computed. |
| 4 | Decide body is `{decision: "refund"\|"partial_refund"\|"reject", reason (required), refund_amount_cents?}`; response `AdminDisputeDecideOut {status, admin_decision, admin_reason, refund_id, resolved_at}`. | **Full refund** sends `decision: "refund"` with no amount (assumes the API refunds the dispute amount; **unverified**, Step 0). **Reject** sends `reject` with the reason. **50%** needs a `refund_amount_cents` the console cannot know without computing: the button renders disabled with "Needs the dispute amount from the API". Seam kept (`decideDispute(id, decision, reason)`) so it is a one-line enablement later. |
| 5 | Stats endpoint absent (`/disputes/stats`); the reports endpoint types are not refunds/disputes. | Three stat cards are shown with their titles and "Not available yet" plus the reason, in their own `SectionBoundary`. No client-side calculation. |
| 6 | Salon reply is `salon_response` (+ `salon_responded_at`), the 48 h window is `salon_deadline`. | Display mapping (pure, tested): replied -> quote (truncated, "Read more" to the detail); no reply and deadline passed -> "No reply after 48 h"; no reply and deadline ahead -> "Waiting". |
| 7 | Statuses: `admin_review` = Needs decision; `salon_review` and `open` = still with the salon. | Decision buttons are enabled only for `admin_review`; for `salon_review`/`open` they are disabled with "Salon has {n} h left" from `salon_deadline` (spec assumption; open question 1). Decided rows (`resolved`, `rejected`) are read-only with `admin_decision`. |
| 8 | List filter is a single `status`. | Default "Active" view merges two calls (`admin_review`, `salon_review`) and sorts Needs decision first, oldest first. "Decided" view merges `resolved` and `rejected`. First 50 of each, shown with a note when more exist (no cursor merge). `open` disputes appear only under "All"... not built; documented gap. |
| 9 | Refund confirm text "Refund LKR 2,400 ... deducted from {salon}" needs an API preview that does not exist. | Confirm dialog for Full refund uses static spec copy ("The full disputed amount is refunded to the client's original payment method and deducted from the salon's next payout.") plus a required reason with presets (spec open question 2 assumption). No amounts shown. |
| 10 | Timeout handling (spec): "Checking the result…" then re-read before retry. | On a network error (status 0) the client calls a `getDisputeStatus(id)` Server Action; if the dispute is already decided it treats the action as done, otherwise it shows "Couldn't confirm the result, check and try again" and allows retry (same idempotency key, so no double refund). |
| 11 | Permission: spec `dispute.decide`; nav currently gated by `disputes.view`. Moderator must not see the page. | Gate page and actions by `dispute.decide` (nav item changed to match, as in plan 02). Real permission strings unverified. |

## 2. Step 0: verify with a real admin (needed)

Same blocker as earlier plans. With a Finance/Support/Super admin token: list disputes by each status, `GET /v1/disputes/{id}` with the admin token (does it work? what extra fields?), and, only on throwaway data, decide `refund` without an amount (what amount is refunded?), `partial_refund` (is the amount required?), and `reject`. Capture sanitised fixtures in `src/test/fixtures/disputes/` (synthetic names and ids). If no credentials: build to the schema, mark the Full refund contract, detail access and the name lookups as unverified, and say so.

## 3. Work breakdown

### Step 1. Feature module (`src/features/disputes/`)
- `schemas.ts` (Zod): `disputeSchema` (fields above, unknown stripped), `disputeListSchema`, decision input schema (uuid id, decision enum `full_refund|reject` for now, reason 3..1000 trimmed).
- `status.ts` (pure, tested): `disputeState(d, now)` -> `needs_decision | salon_window | decided`, `salonReply(d, now)` -> `{kind: "replied"|"none_after_48h"|"waiting", text?}`, `hoursLeft(deadline, now)`, `shortName("Tharindu Jayasinghe")` -> "Tharindu J.", `shortId(uuid)`, `sortQueue` (Needs decision first, oldest first), `truncate(text, n)`.
- `queries.ts` (server, `React.cache`): `getDisputes(view)` (merged calls), `getDispute(id)` (shared detail endpoint, falls back to a list lookup on 403/404 of that endpoint), `getParties(disputes)` (users and salons by id, deduplicated, `allSettled`, returns names only).
- `actions.ts` (`"use server"`, async declarations only): `decideDispute(id, decision, reason, key)` (`dispute.decide`; maps `full_refund` -> `refund`; audit names `dispute.refunded` and `dispute.rejected`; `revalidatePath("/disputes","layout")`), `getDisputeStatus(id)` (permission-checked, returns only `{status}`). Reason never logged.
- Tests: state/reply/short-name/hours-left/sort helpers, decision mapping and validation (bad id, empty reason, forbidden), `getDisputeStatus` returns only the status.

### Step 2. Reason presets
- Add `reasonDialogs.refundDispute(id)` to `reason-presets.ts`: title "Full refund for dispute {shortId}?", the static consequence note (finding 9), presets "Service not as described", "Salon did not respond", "Booking not honoured", Other, confirm "Refund in full", tone neutral. Marked ASSUMPTION per spec open question 2. Existing `rejectDispute` is reused.

### Step 3. List screen (`src/app/(console)/disputes/`)
Read `node_modules/next/dist/docs/` for Next 16 `searchParams` before coding.
- `page.tsx`: `requirePermission("dispute.decide")`, `TopBar` "Disputes and refunds" / "Escalated after 48 hours or by the client", the intro paragraph verbatim, view filter links (Active / Decided), the table and the stat cards each in `SectionBoundary` + `Suspense` (partial state). Empty: "No disputes need a decision" with stat cards still shown. `loading.tsx`, `error.tsx`.
- `DisputesTable` (client, stable columns): Case (short id + "Opened 3 days ago" via `formatRelative`, link to detail), Client · salon (shortened name / salon name), Issue (3-line clamp, category as a small label), Amount (finding 3), Salon reply (finding 6, truncated with Read more link), Status (`StatusPill`), Decision (`DecisionButtons`).
- `StatCards`: three `StatCard`s titled as in the spec, each showing "Not available yet" and the footnote text from the spec only when real data exists (none today).

### Step 4. Decision buttons (`components/decision-buttons.tsx`, client)
- Needs decision: **Full refund** (green, `ReasonDialog` `refundDispute`), **50%** (secondary, disabled with `aria-describedby` explanation, finding 4), **Reject** (red outline, `reasonDialogs.rejectDispute(shortId)`). Salon window: all three disabled with "Salon has {n} h left". Decided: nothing, status pill shows the outcome.
- `onConfirm` -> `decideDispute`; success toast ("Full refund issued" / "Dispute rejected"), `router.refresh()`; 409/403 via the shared handler; timeout handling per finding 10; stable idempotency key per dialog open (already provided by `ReasonDialog`).
- UI gating only; the Server Action re-checks `dispute.decide`.

### Step 5. Detail page (`/disputes/[id]`)
- Header: short id, status pill, category; client (shortened) and salon names (link text only, salon page not built), booking or order reference as the short id, "Opened {date}", salon deadline.
- Conversation: client reason, then salon response (with `salon_responded_at`) or the "Waiting"/"No reply after 48 h" state, plus the salon's refund offer if `offer_refund`.
- Evidence: count and list of links (`rel="noreferrer"`, new tab). Flag: evidence URLs reach the browser (no proxy as in plan 02); product to confirm they are not sensitive.
- Outcome block for decided disputes: `admin_decision`, `admin_reason`, `resolved_at`.
- Same `DecisionButtons`. `loading.tsx`, `error.tsx`, 404 via `notFound()`.

### Step 6. Cross-cutting
- `nav-config.ts`: `/disputes` permission -> `dispute.decide`; `tasks.ts` link `/disputes?status=admin_review` -> `/disputes`.
- `status-pill`: add nothing unless Step 0 reveals new statuses.
- Logging: ids and status only; no names, reasons or evidence URLs.
- Fixtures in `src/test/fixtures/disputes/*` (synthetic).

### Step 7. Tests and quality gates
- Unit: see Step 1.
- Component (Testing Library): table rows (status pill, salon reply states, amount "-"/offer), Needs decision enables buttons, salon window disables them with hours left, decided shows none, Full refund through the dialog sends `full_refund` and the label, Reject sends the label, Other needs 10+ chars, 50% is disabled, double click sends once, 409 toast + refresh, network error then "already decided" treated as done, hidden/disabled without `dispute.decide`; stat cards show "Not available yet"; axe on list and detail.
- Finish with `pnpm lint`, `pnpm typecheck`, `pnpm test` and **`pnpm build`**, then run the app and smoke-test signed-out redirects for `/disputes` and `/disputes/[id]`. Report honestly, including unverified mappings.

## 4. File map (new/changed)

```
src/features/disputes/{schemas.ts,status.ts,queries.ts,actions.ts}
src/features/disputes/components/{disputes-table,decision-buttons,stat-cards,dispute-detail}.tsx
src/app/(console)/disputes/{page.tsx,loading.tsx,error.tsx,[id]/page.tsx,[id]/loading.tsx}
src/components/sb/reason-presets.ts (+ refundDispute, test)
src/components/sb/nav-config.ts  src/features/dashboard/tasks.ts
src/test/fixtures/disputes/*  (+ tests beside each module)
```

## 5. Open questions (defaults in brackets)

1. API to add to the disputes list: client and salon display names, a `DSP-` code, `amount_cents`, `salon_reply.state`, plus `GET /disputes/stats` and a refund preview (`refund_cents`, `deducted_from_salon_cents`). [Not assumed; "-" amount, short ids, "Not available yet" stats, name lookups per row.]
2. 50% refund: how does the console get the amount without computing it (preview endpoint, or a `half_refund` decision without an amount)? [50% disabled.]
3. Does `decision: "refund"` without an amount refund the full dispute amount? [Assumed; verify in Step 0 before shipping.]
4. May admins decide inside the 48 h window (spec Q1)? [No; buttons disabled with hours left.]
5. Reason presets for refunds, custom amounts, status list, item-return flow (spec Q2 to Q5). [Assumed presets; single full-refund path; no return flow.]
6. Does the shared `GET /v1/disputes/{id}` accept the admin token? [Try in Step 0; fall back to the list item.]
7. Are evidence URLs safe to expose to the browser? [Links as-is; flagged.]

## 6. Done criteria

- Super admin, Support and Finance (per real permissions) see `/disputes` with Needs decision first and oldest first; Moderator gets the 403 page and no nav item.
- Full refund and Reject go through a reason dialog, send once (stable idempotency key), update list and badge, and handle 409, 403 and timeouts as specified; the console never sends or computes an amount.
- Disputes inside the salon window show disabled buttons with the hours left; 50% is visibly unavailable with its reason.
- `/disputes/[id]` shows both sides, evidence, the offer and the outcome.
- Lint, typecheck, tests and build pass; unverified mappings and API gaps (names, code, amount, stats, preview, detail access, 50%) are listed in the report.
