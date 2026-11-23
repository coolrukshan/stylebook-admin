# A-10 Re-engagement

Mockup: `A-10_re_engagement.png`.

**Purpose:** show whether win-back nudges to lapsed clients lift rebooking, measured against a holdout group, and tune the engine.
**Roles:** Super admin (view and edit). Others: hidden (assumption; the matrix has no row for this).
**Story:** US-A-17 (should). SRS: ENG-*.
**Route:** `/engagement`.

## Screen content

Title "Re-engagement", subtitle "Win-back notifications measured against a holdout group".

**Three KPI cards (last 30 days)**

| Card | Demo value | Subtext |
|---|---|---|
| Nudges sent · 30 days | 7,820 | 10% holdout received none |
| Extra bookings vs holdout | ≈ 712 | Sent × uplift, summed by stage |
| Opt-out rate | 0.6% | Reminders and offers |

**Chart card "Nudges lift rebooking at every stage"**, subtitle "Share who booked within 14 days, nudged vs holdout, last 30 days". One block per stage, each with a title line (stage, sent count, open rate), an uplift value in green, and two horizontal bars (Nudged in black, Holdout in tan) with a percentage:

| Stage | Sent | Opened | Nudged | Holdout | Uplift |
|---|---|---|---|---|---|
| Due soon | 4,120 | 38% | 31% | 24% | +7 pts |
| Overdue | 2,310 | 41% | 27% | 14% | +13 pts |
| At risk | 980 | 35% | 18% | 7% | +11 pts |
| Lapsed | 410 | 22% | 6% | 2% | +4 pts |

**Card "Engine settings"**

| Setting | Demo value | Editable in mockup |
|---|---|---|
| Stage thresholds | 0.8 · 1.2 · 2.0 · 3.0 | No (text) |
| Frequency cap | 1 / 7 days · 3 / 90 days | No (text) |
| Quiet hours | 9 PM – 8 AM | No (text) |
| Holdout group | 10% with − / + stepper | **Yes** |
| Channels | Push · email · SMS for offers | No |
| Message model | claude-haiku-5-5 | No |

## Acceptance criteria
- Given I open the page, then KPIs, the stage chart and settings load from the API for the last 30 days.
- The bar widths are the API's percentages. Uplift ("+7 pts") is the API's value. The console does not calculate uplift or "extra bookings" (≈ 712 is approximate and comes from the API).
- Given I change the holdout percentage with − / +, then the change is saved only after an explicit confirm. Consequence text: "{N}% of clients will receive no nudges so we can measure impact." A reason is requested (assumption) and `engagement.holdout_changed` is audited. **Open question 1.**
- Changing the holdout percentage affects measurement validity. The confirm must say the comparison restarts from the change date. (API statement; console shows it.)
- Other settings are read-only in this release (text in the mockup). If they become editable, they follow the same confirm-with-reason pattern.
- Given a stage has no data (for example a new stage), then the block shows "Not enough data" and no bars.
- Given the holdout is 0%, then uplift cannot be measured. Show "No holdout, uplift unavailable".

## Business rules
- Charts use Recharts or CSS bars. Must not rely on colour alone: label each bar "Nudged" and "Holdout" with values (already in the mockup). Provide a data table alternative for screen readers.
- Quiet hours are displayed in Asia/Colombo.
- The message model name is informational; never editable here.

## Screen states
| State | Behaviour |
|---|---|
| Loading | Card and chart skeletons |
| Empty | New engine, no sends: "No nudges sent in the last 30 days" |
| Error | Each card retries independently |
| Forbidden | 403 for non-super admins |
| Partial | Stage chart fails while settings load |

## API (proposed)
- `GET /v1/admin/engagement/summary?days=30` → `{ nudges_sent, holdout_pct, extra_bookings_estimate, opt_out_rate, stages[{ key, label, sent, open_rate, nudged_rate, holdout_rate, uplift_pts }] }`
- `GET /v1/admin/engagement/settings` → `{ stage_thresholds[], frequency_caps[{ count, days }], quiet_hours{ start, end }, holdout_pct, channels[], message_model }`
- `PATCH /v1/admin/engagement/settings` body `{ holdout_pct, reason_code, reason_text }`

## Open questions
1. Does a holdout change need a reason and a confirm?
2. What are the units of stage thresholds (0.8, 1.2, 2.0, 3.0: multiples of the client's usual rebooking interval)? A tooltip text is needed.
3. Is the date range fixed at 30 days, or selectable?
4. Is the engine on/off switch needed (kill switch) for incidents?
5. Who may edit settings other than holdout, and where?
