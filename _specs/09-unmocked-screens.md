# A-11, A-15 to A-19: screens with no mockup

No PNGs exist for these. This file is derived **only** from the instructions (§4 and §5), and everything beyond that is marked as an assumption. Each of these needs mockups or a product-owner conversation before build (build order steps 5 and 6).

All of them follow 00-shared: ReasonDialog for destructive writes, API as the source of truth, PII masked, money in LKR from cents, audit entries via the API.

## A-11 Moderation (`/moderation`), US-A-16 (S), ADM-11
- **Purpose:** review reported reviews and AI-generated posts; decide Keep, Hide, or Warn salon.
- **Roles:** Super admin, Support, Moderator (`moderation.act`).
- **Content:** queue of reported items. Each shows content, author, target salon, report reasons and count, status.
- **AC:** Given a reported item, when I choose Keep, then the reports are dismissed. When I choose Hide, then ReasonDialog opens, the item is hidden from clients, and the author is notified (assumption). When I choose Warn salon, then ReasonDialog opens and the salon owner is warned (assumption).
- Dashboard shows "7 reported reviews and AI posts in moderation". The count must match this queue.
- **API gap:** report and item fields. **Question:** are Keep decisions reasoned? Can a Hide be undone?

## A-15 Salon detail (`/salons/[id]`), US-A-19 (M), US-A-20 (C), ADM-06, ADM-17
- **Purpose:** the full profile of a live salon, with moderation controls.
- **Roles:** view: Super admin, Support (Finance read-only for payout info, assumption). Actions: Super admin and Support.
- **Content:** branches, staff, services, bookings, complaints.
- **Actions:** Suspend, Close (both ReasonDialog, red), Feature on home (toggle, audited; assumption: no reason).
- **View as salon (could):** read-only view of the salon's app with a visible banner "Viewing as {salon} · read-only" and an audit entry when it starts. No writes can be made in this mode.
- **Entry points:** global search results, links from disputes, applications, payout accounts and users.
- **Questions:** What happens to upcoming bookings when a salon is suspended or closed (as for user suspension)? Is Close permanent? Are staff contact details shown (PII masking)?

## A-16 Financial reports (`/reports`), US-A-21 (M), ADM-15
- **Purpose:** GMV, commission, refunds and payouts by period and by salon, with CSV export.
- **Roles:** Super admin and Finance.
- **Content:** period picker (week, month, custom), salon filter, summary cards, table, Recharts chart.
- **AC:** All numbers come from the API. CSV streams from the API (audited, `report.exported`). Money shows as LKR from cents. Filters live in the URL.
- **Gap:** whether reports reconcile to payout runs (A-06). Date ranges beyond a year.

## A-17 Support tickets (`/tickets`), US-A-22 (S), ADM-22
- **Purpose:** handle tickets from clients and salons: assign, reply, close.
- **Roles:** Support and Super admin.
- **Content:** ticket list (requester type, subject, status, assignee, age), detail thread with reply composer.
- **AC (assumed):** assign to self or another support admin; reply sends to the requester; close needs a preset reason (assumption).
- **Gap:** ticket status model, SLA timers, canned replies, attachments (PII), and whether replies are emailed.

## A-18 Catalogue and platform settings (`/catalogue`), US-A-23 (M), ADM-12, ADM-13
- **Purpose:** manage categories, brands, home banners, cancellation defaults and AI credit limits.
- **Roles:** Super admin.
- **Content:** tabbed page (Categories, Brands, Home banners, Cancellation defaults, AI credit limits).
- **AC (assumed):** create, edit, reorder, deactivate items. Banners need image upload, link target and schedule. Cancellation defaults and AI credit limits are numeric settings saved with a reason. Each change is audited.
- **Gap:** image storage and size rules; whether cancellation defaults overlap with the A-09 deposit and no-show settings.

## A-19 Announcements (`/announcements`), US-A-24 (S), ADM-14
- **Purpose:** push or email to a segment, with preview and schedule.
- **Roles:** Super admin.
- **Content:** composer (channel, segment, title, body), preview (as the recipient sees it), schedule picker (Asia/Colombo), sent history.
- **AC (assumed):** Send or schedule opens a confirm showing the recipient count from the API. Scheduled items can be cancelled before they send. Each send is audited.
- **Gap:** segment definitions, opt-out handling (the A-10 opt-out rate), rate limits, and whether marketing announcements respect quiet hours.

## What dev needs before starting these
Mockups for A-11 and A-15 to A-19, the matching `/v1/admin/*` operations in `openapi.json`, and answers to the questions above. Until then build only the nav entries and a placeholder "Coming soon" page that respects the role guard.
