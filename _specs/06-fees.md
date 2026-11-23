# A-09 Fees and commission

Mockup: `A-09_fees_and_commission.png`.

**Purpose:** set platform-wide commission, deposit, no-show cap and AI price, see a worked example, and manage per-salon overrides.
**Roles:** Super admin and Finance (`fees.change`). Others: hidden (assumption; read-only view for Support is an open question).
**Stories:** US-A-10 (M), US-A-11 (S). SRS: ADM-08, ADM-21, BR-11.
**Route:** `/fees`.

## Screen content

**Card "Platform defaults"** with five stepper rows (− value +):

| Setting | Helper text | Demo value |
|---|---|---|
| Commission on services | Per completed booking | 8% |
| Commission on products | Per marketplace order | 10% |
| Default deposit for new clients | Salons can change it | 30% |
| Max no-show fee salons can set | Share of the booking price | 50% |
| AI Studio price | Credits per generated post | 6 cr |

Note: "Tips always go 100% to the specialist; no commission. Changes apply to bookings and orders made after saving, and salons get 14 days' notice." Button: **Save and notify salons** (black pill).

**Card "Example · LKR 5,000 booking + LKR 2,000 product + LKR 500 tip"** (worked example):

| Row | Demo value |
|---|---|
| Service commission (8%) | LKR 400 |
| Product commission (10%) | LKR 200 |
| Tip commission | LKR 0 |
| **Salon receives** | LKR 6,900 |

**Salon overrides** (same card): "Looks Unisex Salon · 6% · until 31 Dec", "New salons (first 60 days) · 0% on services".

## Acceptance criteria

**Edit defaults**
- Given I have `fees.change`, when I press + or −, then the value changes by one step (percent: 1 pt; AI price: 1 credit) within the API's allowed range (min and max come from the API). At a limit the button is disabled.
- The value can also be typed (assumption, for keyboard and accessibility). Each stepper has a label, `aria-valuenow` and range.
- Given I change a value, then the worked example refreshes from the API preview endpoint (debounced). The console does **not** calculate the example. While fetching, show a subtle loading state, and keep the previous result visible and marked "Updating…".
- Given unsaved changes exist, then a "Unsaved changes" indicator shows and leaving the page asks for confirmation. A Reset link restores the saved values (assumption).
- Tips: commission on tips is fixed at 0 and cannot be edited. The row shows LKR 0 from the API.

**Save and notify salons**
- Given I click Save and notify salons, then a confirmation shows what changes (old → new for each setting that changed) and the effective date (14 days' notice). Then a ReasonDialog-style reason is requested (assumption: fee changes are high-impact, and the audit log should explain them). **Open question.**
- Given I confirm, then the API saves the settings, schedules the notice to all salons, and writes `fees.updated` with old and new values.
- Given nothing changed, then the button is disabled.
- Changes apply only to bookings and orders made after saving. Existing bookings keep their rate. This is API behaviour, only described in the UI.

**Salon overrides (US-A-11, should)**
- The mockup shows the overrides as a read-only list. Given I am Finance, then there should be an "Add override" action: pick a salon, a rate per type, and an **end date** (for example "until 31 Dec") with a reason. This is **not in the mockup**, so it is a text-only requirement.
- The "New salons (first 60 days) · 0% on services" row is a platform rule (an automatic override), not a per-salon one. It is shown read-only. Its editing is an open question.
- Given an override end date passes, then the salon returns to the default. The API does this, and the list drops the row.

## Business rules
- The API is the source of truth for every number, including the example.
- Deposit and no-show cap are bounded (for example no-show max ≤ 100%). The API validates; Zod validates the same bounds client-side.
- All fee writes are audited with old and new values.
- Salons get 14 days' notice. Effective date = save date + 14 days, supplied by the API. The console does not compute dates.

## Screen states
| State | Behaviour |
|---|---|
| Loading | Skeleton rows and example card |
| Empty | Overrides: "No salon overrides" |
| Error | Example preview fails: "Couldn't load the example" and Save is disabled until it loads. Save fails: keep the edited values, show the error |
| Forbidden | 403 for roles without view. A role with view but not change sees values as text (no steppers, no Save) |
| Partial | Overrides fail while defaults load |

## API (proposed)
- `GET /v1/admin/fees` → `{ service_commission_pct, product_commission_pct, default_deposit_pct, max_no_show_pct, ai_studio_price_credits, limits{ … }, overrides[{ id, salon?{ id, name }, scope, service_pct, product_pct, ends_at }], notice_days: 14 }`
- `POST /v1/admin/fees/preview` body `{ …draft values, example{ booking_cents:500000, product_cents:200000, tip_cents:50000 } }` → `{ service_commission_cents, product_commission_cents, tip_commission_cents, salon_receives_cents }`
- `PUT /v1/admin/fees` body `{ values, reason_code, reason_text }`
- `POST /v1/admin/fees/overrides`, `DELETE /v1/admin/fees/overrides/{id}` (gap: confirm these exist)

## Open questions
1. Does saving fees need a reason? Are there presets?
2. Who can edit the example amounts? Fixed at 5,000 / 2,000 / 500?
3. Is the "new salons 0% for 60 days" rule editable here?
4. Does the 14-day notice apply to decreases too, or only increases?
5. Can Support see this page read-only?
6. Is AI Studio price in credits tied to LKR anywhere? (Not displayed.)
