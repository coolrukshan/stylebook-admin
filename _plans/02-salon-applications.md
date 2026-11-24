# Plan 02: Salon applications (A-04, with A-14 reasons)

Spec: `_specs/02-salon-applications.md`. Mockups: `admin/A-04_salon_applications.png`, `admin/A-04_salon_application_detail_other.png`, `admin/A-14_reason_reject_salon.png`, `admin/A-14_reason_request_info.png`.
API: `http://localhost:8000` (`src/lib/api/schema.d.ts` already generated; re-run `pnpm api:gen` first and commit any diff).
Depends on plans 00 and 01 (committed). Branch: `main` is checked out, so create `feature/salon-applications` from it before coding. Do not commit unless asked.

## 0. What already exists

`ReasonDialog` + `reasonDialogs.rejectSalon/requestInfo` (labels and notes already match the spec), `runAdminAction` (permission + idempotency key + `ActionResult`), `useActionErrorHandler` (409/403/401), `requirePermission`, `StatusPill` (already maps `in_review`, `info_requested`, `approved`, `rejected`, `received`, `missing`), `EmptyState`, `ErrorCard`, `SectionBoundary`, skeletons, `getNavCounts`, `formatDateTime`, sonner toasts, nuqs, and nav entry `/applications` (badge `applications`). No `/applications` route yet; the dashboard link already points at it.

## 1. API findings that change the spec

| # | Finding | Handling |
|---|---|---|
| 1 | Endpoints are `GET /v1/admin/applications` (`status`, `cursor`, `limit`), `GET /applications/{id}`, and **one** `POST /applications/{id}/{action}` with body `DecisionIn {reason?}`. Spec's `/salon-applications/...`, `/approve`, `/request-info`, `/reject` paths do not exist; `{action}` is a free string (`approve`, `request_info`, `reject`; exact values to confirm). | Build against the real shape. Wrap in one typed `decide(id, action, reason?)`; action values are a const union in one place. |
| 2 | **No `reason_code`, only `reason`** (optional in API). Same as plan 00 finding 5. | Send `reason` (label or free text). Console still requires it for request-info and reject. Approve sends no body. |
| 3 | **Detail has no documents state, no AI check, no photos, no lat/lng.** `documents[] = {type, url, uploaded_at}`; there is `business_registration` (a string number), `staff_count`, `services_description`, `owner_user`, `owner_phone`, `owner_email`, and `history[] {action, actor_name, reason, timestamp}`. | Derive tile state only from presence: a tile is "Received" if a document of that type exists, else "Missing". That is display of API data, not a computed business value. Document `type` strings are unknown (likely `business_registration`, `nic`, `proof_of_address`, `photo`); confirm with a real call and keep the mapping in `document-tiles.ts` with an "Unrecognised document" fallback so nothing is hidden. Photos tile count = number of photo documents. |
| 4 | **No AI check** in the API. | Render the panel with "AI check not available yet" (the spec's Partial state wording is "AI check pending"; use that only if a field appears). Keep the component taking `summary \| null` so wiring is trivial later. Flag as gap. |
| 5 | **No map coordinates.** | Map pin area is a placeholder card showing the address and city (as the mockup itself is a placeholder). No provider, no `NEXT_PUBLIC_` key. Flag as gap. |
| 6 | `document.url` is a plain URL, not a short-lived signed URL, and there is no audited document-view endpoint. NIC is PII. | Never render document URLs in the initial HTML or client props. Server route `GET /api/applications/[id]/documents/[index]` re-checks permission, fetches the detail, streams the file (`no-store`, `Content-Disposition: inline`), and logs only ids. The viewer opens `/api/...` in a dialog (img or PDF `<iframe>`/link). Auditing the view is **not possible without an API endpoint**: flag as a hard gap, do not fake it. NIC tile opens only on explicit click. If streaming is blocked by CORS/auth on the storage host, fall back to a server redirect and say so. |
| 7 | **No `Info requested` pause semantics visible**, but `status` is a free string and `history` exists. | Statuses handled: `in_review` (spec) plus whatever the API sends. Spec says "pending" in `getNavCounts` and the dashboard (`status: "pending"`). **Step 0 must confirm which string new applications carry** (`pending` vs `in_review`); the list filter, nav badge and pill all depend on it. Only the actionable status shows the three buttons; others are read-only with status and history. |
| 8 | List is **cursor-paged** and has no `sort`. | Request `status=<actionable>&limit=50`; sort client-side by `submitted_at` ascending within the loaded page (display order only, spec assumption). If `next_cursor` exists, "Load more" appends the next page. Flag that true oldest-first needs an API `sort`. |
| 9 | Decision response `ApplicationDecisionOut` returns the new `status`. | Use it to update the UI immediately, then `router.refresh()` for list and badge. |
| 10 | Owner contact **is** in the API (`owner_phone`, `owner_email`). The spec says "nothing to mask". | Do **not** show phone/email in v1 (not in mockup). If shown later, route through `MaskedValue`/mask helper. Never include them in logs. |
| 11 | Permission: spec `salon_application.approve` exists in `PermissionKey`, but the nav item is gated by `salons.view` (assumed). Finance and Moderator must not see the page. | Gate page and every action with `salon_application.approve`; change the nav item permission to match. Real API strings remain unverified (plan 01 Step 0). |
| 12 | Spec says approve works even with a Missing document; API may refuse (422/409). | Keep Approve enabled; surface the API reason inline/toast (spec). |

## 2. Step 0: verify with a real admin (needed for accuracy)

Same blocker as plan 01 Step 0. With a Super admin or Support token on the local API, call: list (no filter, then `status=pending`, `status=in_review`), one detail, and the action endpoint on a throwaway application. Capture sanitised fixtures in `src/test/fixtures/applications/`. Confirm: status strings, document `type` strings, valid `{action}` values, what happens on a second decision (409 body), and whether the API sends the same `X-Request-Id`. If no credentials: build to the schema, mark the mapper and status strings as unverified, and say so in the report.

## 3. Work breakdown

### Step 1. Feature module (`src/features/applications/`)
- `schemas.ts` (Zod): `applicationItemSchema`, `applicationDetailSchema` parsed from the API payload (trust boundary; unknown extra fields stripped), `decisionActionSchema = z.enum(["approve","request_info","reject"])`.
- `status.ts`: `ACTIONABLE_STATUS` constant (single source for list filter, nav badge and dashboard), `isActionable(status)`.
- `document-tiles.ts` (pure, tested): `buildTiles(documents)` returns the four tiles `{key, label, state: "received"|"missing", count?, index?}` in spec order; unknown types go to an "Other documents" list; no mutation of API data.
- `queries.ts` (server, `React.cache`): `getApplications({status, cursor})`, `getApplication(id)`. Both parse with Zod and throw `ApiError` for `SectionBoundary`/`error.tsx`. 404 -> `notFound()`.
- `actions.ts` (`"use server"`): `approveApplication(id)`, `requestInfo(id, reason, key)`, `rejectApplication(id, reason, key)`, each `runAdminAction({permission: "salon_application.approve", name: "salon_application.approved|info_requested|rejected", ...})`. Validate `id` as uuid and `reason` (3..1000 after trim; request-info and reject require it). Return the new status. No reason or owner data in logs (logger already redacts; do not pass it anyway).
- Tests: tile builder (all received, one missing, unknown type, zero photos), schema parsing (missing optional fields), action validation (bad uuid, empty reason, forbidden role).

### Step 2. Routes (`src/app/(console)/applications/`)
Read `node_modules/next/dist/docs/01-app/` for the Next 16 specifics before coding: dynamic route `params` is a Promise, `loading.tsx`, `forbidden()`, `refresh()` in Server Actions, and the shared-layout approach below.
- `layout.tsx`: `requirePermission("salon_application.approve")`, `TopBar` ("Salon applications"), two-column grid (list ~360px, detail flexible). The list is rendered in the layout (a Server Component streamed in `Suspense`) so it persists while the detail segment changes. Selection lives in the URL: `/applications/[id]`.
- `page.tsx` (`/applications`): if the queue is non-empty, `redirect()` to the first application (spec A-04.5: "next one is selected"); if empty, the empty state in both panels ("No applications to review" + illustration, detail "Select an application").
- `[id]/page.tsx`: detail panel. `[id]/loading.tsx`: detail skeleton. List has its own skeleton via `Suspense`.
- `error.tsx` for the segment: inline `ErrorCard` with retry (reuse); forbidden handled by the existing 403 page.
- A selected id that is no longer actionable (decided by someone else) still renders read-only, so shared links keep working.

### Step 3. List (left card) (`components/application-list.tsx`)
- Rows are `<Link>` (`aria-current="page"` on the selected one), showing salon name, `{city} · submitted {d MMM}` (Asia/Colombo via `formatDateTime`-family helper; add a `formatShortDate` to `src/lib/format/date.ts` with test), and a `StatusPill`. Selected row highlighted with tokens only.
- Missing city: show "Submitted {date}" only. "Load more" button for `next_cursor` (client island using a Server Action or a route handler, kept small).
- After a decision, `router.refresh()` plus navigating to the next row. Next-row logic is a pure function `nextSelection(ids, decidedId)` (next after the decided one, else previous, else none), tested.

### Step 4. Detail (right card) (`components/application-detail.tsx`, mostly Server Components)
- Header: salon name, pill, `{address} · owner {owner_name}` (omit missing parts cleanly). Optional secondary line: business registration number, staff count, services description if present (extra API data; small, not in mockup, call out in PR).
- `DocumentTiles`: four tiles with state icon + text (never colour only). Received tiles are buttons opening `DocumentViewer`; Missing tiles are plain, non-interactive.
- `DocumentViewer` (client, `ui/dialog`): image or PDF (decide by content type from the proxy route), keyboard navigation for the photos gallery (arrow keys, Esc, focus return, `aria-label`s "Photo 3 of 8"), per-image error state with retry (spec Partial state). Never put the document URL in the DOM; only `/api/applications/...` paths.
- `AiCheckPanel`: finding 4 copy; label "AI DOCUMENT CHECK" and an advisory note.
- `LocationCard`: address placeholder (finding 5).
- `History` list (finding 7 / open question 6): collapsible "History" showing `action`, `actor_name`, `reason`, timestamp. Cheap because the API already returns it.
- Read-only states: non-actionable status shows the pill, decided-by/at and reason, and no buttons.

### Step 5. Actions (`components/decision-actions.tsx`, client)
- **Approve**: green button, no dialog. `useTransition` + disabled while pending; calls `approveApplication`; on ok toast "{salon} approved", then select the next application and refresh (list, sidebar badge, dashboard count all come from the same `getNavCounts`; also invalidate the polling query key from plan 01). On error: `useActionErrorHandler` (409 toast + refresh), otherwise toast with the API message and request id.
- **Request info**: `ReasonDialog` with `reasonDialogs.requestInfo(salon)`; `onConfirm` calls `requestInfo`. Toast "Info requested from {salon}". Status becomes `info_requested`; the row leaves the actionable queue.
- **Reject**: `ReasonDialog` with `reasonDialogs.rejectSalon(salon)` (red confirm "Reject application"). Toast "{salon} rejected".
- Buttons only when `isActionable(status)`. Approve = `Button` with a success token class (check `button.tsx` variants first; add a variant rather than inline colours), Request info = `outline`/secondary, Reject = danger outline. The server action re-checks the permission regardless of UI.
- Note: the spec's 30-day re-apply copy is already in `rejectSalon.note`; owner-visible reason notice is already handled by `ownerVisible`.

### Step 6. Cross-cutting
- `nav-config.ts`: `/applications` permission -> `salon_application.approve`; `getNavCounts` and dashboard task use `ACTIONABLE_STATUS` instead of the literal `"pending"` (keeps badge and list in sync; update their tests).
- `proxy.ts` needs no change (route is under the authenticated matcher).
- `STATUS_MAP`: add nothing unless Step 0 reveals new strings.
- Logging: ids and status only; no names, owner contact, reasons or document URLs. Add a test that the document proxy route does not log URLs.
- Add `src/test/fixtures/applications/*` (sanitised) for MSW.

### Step 7. Tests and quality gates
- Unit: tile builder, `nextSelection`, schemas, `formatShortDate`, action input validation, permission guard (Finance/Moderator forbidden).
- Component (Testing Library + MSW at the API boundary): list rows and selection highlight, detail with a missing tile, read-only for non-actionable status, Approve success (toast, next selection), Approve 409 (toast + refresh), Request info and Reject through `ReasonDialog` (Other needs text; payload carries label/free text), gallery keyboard navigation, photo error + retry, AI panel pending copy, empty states, axe on list and detail.
- E2E (Playwright): only the 403 path for a limited role if a seeded role exists; otherwise note as manual.
- Finish with `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`; report results honestly, including anything unverified.

## 4. File map (new/changed)

```
src/features/applications/{schemas.ts,status.ts,document-tiles.ts,queries.ts,actions.ts,next-selection.ts}
src/features/applications/components/{application-list,application-detail,document-tiles,document-viewer,ai-check-panel,location-card,history,decision-actions}.tsx
src/app/(console)/applications/{layout.tsx,page.tsx,error.tsx,[id]/page.tsx,[id]/loading.tsx}
src/app/api/applications/[id]/documents/[index]/route.ts
src/components/sb/nav-config.ts   src/lib/api/nav-counts.ts   src/features/dashboard/tasks.ts
src/lib/format/date.ts (+ test)   src/components/ui/button.tsx (success variant, if absent)
src/test/fixtures/applications/*  (+ tests beside each module)
```

## 5. Open questions (defaults in brackets)

1. What status string do new applications carry: `pending` or `in_review`? [Confirm in Step 0; one constant drives everything.]
2. Valid `{action}` values and whether `request_info` accepts a reason. [`approve`, `request_info`, `reject`.]
3. Can the API add: AI check, photo/doc `state`, lat/lng, `sort`, a signed and audited document-view endpoint, `reason_code`? [Not assumed; console degrades as in section 1.]
4. Approve while a document is Missing. [Allowed in UI; API decides.]
5. Request info free-text message beyond the preset reason (spec Q2). [No; reason only.]
6. Reply deadline and auto-close (spec Q3), 30-day block configurability (Q5). [Out of scope; copy only.]
7. Document viewer without an audit endpoint: ship with a visible gap, or hold NIC viewing until the API can audit it? [Ship, viewer behind explicit click, gap flagged in the PR. Product owner to confirm for NIC.]

## 6. Done criteria

- Super admin and Support can open `/applications`, see the oldest actionable application selected, and share `/applications/[id]` links; Finance and Moderator get the 403 page and no nav item.
- Approve, Request info and Reject each hit the API once (idempotency key stable per dialog open), update list, sidebar badge and dashboard count together, and move selection to the next application; the empty state shows when none remain.
- A second admin acting on an already-decided application gets the 409 toast and a refresh, and the page shows it read-only.
- Document URLs, NIC content, owner contact and reasons never appear in logs, client props or the initial HTML; document viewing goes through the server route only.
- Lint, typecheck, tests and build pass; unverified mappings and API gaps (AI check, map, audited document view, sort) are listed in the report.
