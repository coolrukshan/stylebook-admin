# Plan 06: Fees and commission (A-09), plus a permission-name fix

Spec: `_specs/06-fees.md`. Mockup: `admin/A-09_fees_and_commission.png`.
API: `http://localhost:8000` (down when this plan was written). Facts below were read from `src/lib/api/schema.d.ts` and the backend source in `../StylebookAPI` (HEAD `9f7a658`, with uncommitted changes, so the running API may differ).
Depends on plans 00 to 05 (on `main`). Branch: `feature/fees` (created from `main`). Do not commit unless asked.

## 0. First: fix the permission names (affects merged screens)

The API checks these strings (`require_permission` in `core/deps.py`; `super_admin` bypasses everything). `API_PERMISSIONS` in `src/lib/auth/permissions.ts` was guessed, and several guesses are wrong, so a non-super-admin who holds the right permission gets the console's 403 page or hidden buttons.

| Console key | API string | Today |
|---|---|---|
| `dashboard.view` | `reports.read` | ok |
| `users.view` | `users.read` | ok |
| `user.suspend` | `users.suspend` | ok |
| `salons.view` | `salons.read` | ok |
| `dispute.decide` | `disputes.decide` | ok |
| `disputes.view` | `disputes.read` | ok |
| `audit.view` | `audit.read` | ok |
| `salon_application.approve` | `applications.decide` | **wrong** |
| `payout_account.verify`, `bank_account.reveal`, `payout_run.approve` | `payouts.manage` | **wrong** |
| `fees.change` | `fees.manage` | **wrong** |
| `fees.view` (new) | `fees.read` (or `fees.manage`) | missing |
| `moderation.act` | `moderation.decide` | **wrong** |
| `admin.manage` | `roles.manage` | **wrong** |
| `engagement.edit` | `engagement.manage` | **wrong** |

The API also accepts the colon form (`replace(".", ":")`) for every permission, plus `disputes:write` (decide), `payouts:write` (manage) and `fees:write` (manage). Map exactly these, remove the invented strings, and add a table-driven test asserting each console key against each accepted API string and rejecting the old guesses.

## 1. API findings that change the spec

| # | Finding (source) | Handling |
|---|---|---|
| 1 | `GET /v1/admin/fees` -> `service_commission_percent, product_commission_percent, deposit_default_percent, max_no_show_fee_percent, ai_credit_price_cents, updated_at, updated_by`. No `limits`, no overrides, no `notice_days`. | Bounds are mirrored from the API's request schema: commissions 0 to 50, deposit and no-show cap 0 to 100, AI price 0 or more, integers. One constant, used by steppers and Zod. The API still validates. |
| 2 | **AI price is LKR per credit** (`ai_credit_price_cents`), not "credits per generated post". Per-generation credit costs exist in the API but are not exposed. | Row label "AI credit price", helper "Price per AI credit", value shown with `formatLkr`. Stepper step = LKR 1 (100 cents); typed values accepted in whole or 2-decimal rupees, converted with integer parsing (no float maths). |
| 3 | `PUT /v1/admin/fees` takes only changed numbers. **No reason** (the audit reason is hard-coded "Platform fees updated"), audit action `fees.update` with old and new values. | No reason dialog (a typed reason would be silently dropped). Confirm dialog listing old -> new for each changed setting. Send only changed fields. |
| 4 | **Nothing notifies salons and nothing is scheduled**: the update applies immediately and clears the rate cache. No 14-day notice exists. | The button is **"Save changes"**, not "Save and notify salons". The note must not promise notice. Confirm dialog says "Takes effect immediately. Salons are not notified by this action." Product owner to decide (open question 1): this contradicts spec and mockup. |
| 5 | When rates apply: service commission is locked on the booking at creation, product commission on the order; payout runs reuse the locked rate. The **no-show cap is read when a booking is marked no-show**, so it affects existing bookings. No code reading `deposit_default_percent` or `ai_credit_price_cents` was found outside the settings endpoints. | Note copy: "Tips always go 100% to the specialist; no commission. New commission rates apply to bookings and orders made after saving. The no-show cap applies from now on, including to existing bookings." Report the two apparently unused settings; do not claim an effect for them. |
| 6 | **No preview endpoint.** | The worked-example card keeps its title and rows but shows "Not available yet"; the console never calculates it. Save is **not** blocked by the missing preview (spec assumes a preview that does not exist). |
| 7 | Overrides: `GET /fees/overrides` (`salon_id`, `limit`; `next_cursor` is always null), `POST {salon_id, service_commission_percent?, product_commission_percent?}` (upsert: **a null field deletes that rate**), `DELETE /fees/overrides/{id}` (the list `id` is the salon id; either works). **No end date, no reason, no "new salons 60 days" rule.** | List shows salon and the rates present ("6% services · 8% products"), no "until" date, no automatic-rule row. Add/edit/remove are possible. Edit always sends both current values so one is never deleted by accident; at least one rate is required. |
| 8 | Adding an override needs a salon picker: `GET /v1/admin/salons?q=` requires `salons.read`. | Debounced search through a Server Action. If the admin lacks `salons.read` or it fails, show "You can't search salons" and disable Add; editing and removing still work. |
| 9 | Permissions: `fees.read` to view, `fees.manage` to change. | Page gated by `fees.view`. Without `fees.change` the values render as text with no steppers, Save, or override actions (spec "view but not change"). Nav item gated by `fees.view`. Actions re-check `fees.change`. |

Also confirmed from the backend while checking, no change needed here: application statuses are `pending | info_requested | approved | rejected` with actions `approve | request_info | reject`; a dispute `refund` with no amount refunds the full paid amount. **Follow-up for plan 02:** the API also allows approve and reject on `info_requested`, which the console shows read-only.

## 2. Step 0b: verify with a running API

When the local API is up: with a Finance admin, read fees and overrides, save one change on dev data and read it back, add, edit and remove an override, and confirm `/admin/me` permission strings match section 0. Capture synthetic fixtures. If it stays down or there are no credentials, say so in the report.

## 3. Work breakdown

### Step 1. Permissions (`src/lib/auth/`)
- Rewrite `API_PERMISSIONS` per section 0, add `fees.view`; update comments (no longer "unverified"); table-driven tests. Run the whole suite: sidebar, dashboard and route tests may rely on old strings.

### Step 2. Feature module (`src/features/fees/`)
- `schemas.ts` (Zod): `feeSettingsSchema`, `feeOverrideSchema`, list; `BOUNDS`; `feeUpdateSchema` (at least one field, integers in range); `overrideSchema` (uuid salon, rates 0 to 50, at least one).
- `fields.ts` (pure, tested): the five rows (key, label, helper, unit `percent | money`, step, min, max); `clamp`, `diff(saved, draft)` -> changed fields with old and new; `formatFee(field, value)`; `parseRupees("12.50")` -> 1250 or null (string parsing, no floats).
- `queries.ts` (server, `React.cache`): `getFeeSettings`, `getFeeOverrides` (limit 50, note if more could exist).
- `actions.ts` (`"use server"`, async declarations only): `saveFees(changes, key)`, `saveOverride(input, key)`, `removeOverride(id, key)` (all `fees.change`, `runAdminAction`, audit names `fees.update`, `fees.override`, `fees.override.delete`, `revalidatePath("/fees")`), `searchSalons(q)` (`salons.view`, returns `{id, name, city}` only).
- Tests: diff, bounds, rupee parsing, schema rules, action validation and permissions, only changed fields sent, edit sends both rates.

### Step 3. Screen (`src/app/(console)/fees/`)
Read `node_modules/next/dist/docs/` for anything new used.
- `page.tsx`: `requirePermission("fees.view")`, `TopBar` "Fees and commission" / "Platform defaults and salon overrides", two columns. Defaults, example and overrides each in `SectionBoundary` + `Suspense` (overrides can fail while defaults load). `loading.tsx`, `error.tsx`.

### Step 4. Defaults card (client, `components/fee-settings-form.tsx`)
- Five `Stepper` rows: labelled input with `role="spinbutton"`, `aria-valuenow/min/max/valuetext`, − and + buttons disabled at limits, arrow keys step, typing allowed, invalid input shows an inline error and blocks Save.
- "Unsaved changes" indicator, **Reset** link, Save disabled when nothing changed or invalid.
- Leaving with unsaved changes asks for confirmation: `beforeunload` for reload and close, and a capture-phase click guard for in-app links (check the Next 16 docs for a supported navigation-blocking API first; document the browser Back button as not covered if so).
- Save -> confirm dialog (old -> new table, finding 4 text) -> `saveFees`; on success toast "Fees saved", refresh and reset the baseline; on failure **keep the edited values** and show the error. One idempotency key per dialog open.
- If another admin changed the settings (the refreshed `updated_at` differs while there are unsaved edits), show "Settings changed since you started" with Reset. The API has no version check, so this is a warning only.
- Read-only variant for `fees.view` without `fees.change`.

### Step 5. Example and overrides (right column)
- `ExampleCard`: spec title, four rows reading "Not available yet" with one explanation line.
- `OverridesCard`: list (empty "No salon overrides"); with `fees.change`: **Add override** dialog (salon search, two optional rate inputs), **Edit** (prefilled with both), **Remove** (confirm). Note under the list: "Overrides have no end date; remove them when they expire."

### Step 6. Cross-cutting
- `nav-config.ts`: `/fees` permission `fees.view`. Dashboard already reads the default rate from `/admin/fees`.
- Logging: ids and action names only.

### Step 7. Tests and quality gates
- Component (Testing Library): stepper limits, keyboard and typed input, money row, unsaved indicator and Reset, Save disabled states, confirm lists only changes, failure keeps values, read-only variant, override add/edit/remove (edit sends both rates), salon search unavailable, example placeholder, empty overrides, axe.
- Finish with `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, run the app and smoke-test the signed-out redirect for `/fees`. Report honestly.

## 4. File map (new/changed)

```
src/lib/auth/permissions.ts (+ test)
src/features/fees/{schemas.ts,fields.ts,queries.ts,actions.ts}
src/features/fees/components/{fee-settings-form,stepper,save-fees-dialog,example-card,overrides-card,override-dialog}.tsx
src/app/(console)/fees/{page.tsx,loading.tsx,error.tsx}
src/components/sb/nav-config.ts
(+ tests beside each module)
```

## 5. Open questions (defaults in brackets)

1. Salons get no notice and changes are immediate. Should the API add notification, a 14-day effective date and a reason before this ships to real admins? [Ship with truthful copy and "Save changes"; product owner to confirm.]
2. API to add a preview endpoint for the worked example. [Card shows "Not available yet".]
3. Override end dates and the "new salons 0% for 60 days" rule. [Not supported; omitted.]
4. Are `deposit_default_percent` and `ai_credit_price_cents` meant to be consumed somewhere? [Editable as the API allows; report to the API team.]
5. May Support see the page read-only (spec Q5)? [Whoever holds `fees.read`.]

## 6. Done criteria

- Permission checks match the API's strings, so Finance can use payouts and fees, and Support or others get exactly what their API permissions allow.
- `/fees` shows the five defaults with accessible steppers within API bounds, saves only changed values after an old -> new confirmation, keeps edits on failure, and warns before losing them.
- No copy promises a notice or date the API does not provide; no value is computed in the console.
- Overrides can be listed, added, edited and removed without accidentally deleting a rate.
- Lint, typecheck, tests and build pass; every API gap is listed in the report.
