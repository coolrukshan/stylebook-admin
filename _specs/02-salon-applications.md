# A-04 Salon applications

Mockups: `A-04_salon_applications.png`, `A-04_salon_application_detail_other.png`, `A-14_reason_reject_salon.png`, `A-14_reason_request_info.png`.

**Purpose:** check a new salon's documents before it goes live; approve, ask for more, or reject.
**Roles:** Super admin, Support (`salon_application.approve`). Finance and Moderator: page hidden.
**Stories:** US-A-05, US-A-06. SRS: ADM-05, ADM-19.
**Routes:** `/applications` and `/applications/[id]`. The mockup is a master-detail layout on one screen: a list on the left and the selected application on the right. Selecting a row should update the URL to `/applications/[id]` so a link opens the same view.

## Screen content

**List (left card).** Each row: salon name, "{city} · submitted {date}" (for example "Kandy · submitted 23 Oct"), status pill "In review". The selected row is highlighted. Order: oldest submission first (assumption, so the queue is worked in order).

**Detail (right card).**
- Header: salon name, status pill, then "{address} · owner {owner name}".
- Four document tiles, each with a state: **Business registration**, **Owner NIC**, **Proof of address**, **Salon photos (N)**. State is "Received" (green) or "Missing" (red).
- **AI DOCUMENT CHECK** panel: a free-text summary from the AI check (for example "Proof of address is missing. Business name matches the registration certificate. Photos show a working salon interior.").
- Map pin and salon photos area (placeholder in the mockup).
- Actions: **Approve** (green), **Request info** (secondary), **Reject** (red outline).

## Statuses

`In review` is the only one in the mockups. The API likely also has `Info requested` (paused until the owner replies), `Approved` and `Rejected`. Only `In review` applications show the three actions. Others are shown read-only with their status. **Gap:** confirm the status enum.

## User stories and acceptance criteria

**A-04.1 Review documents**
- Given an application in review, when I open it, then I see the four document tiles with Received or Missing, the AI check text, the map pin and the photos.
- Given a tile says Received, when I activate it, then the document opens in a viewer (image or PDF) from a short-lived signed URL. Documents contain PII (NIC), so each open is an audited view. **Assumption: not in the mockup; confirm.**
- Given Salon photos (8), then a gallery shows 8 images with keyboard navigation.
- The AI check is advisory. The console shows it and never overrides it. Approve stays available even if a document is Missing (decision for the product owner; see questions).

**A-04.2 Approve**
- Given an application in review, when I click Approve, then no dialog opens (pure approval). The API is called, the status changes, the list row leaves the queue, the sidebar badge decreases by 1, and a toast shows "{salon} approved".
- Given the API refuses (409 already handled, 422 documents missing), then show the API's reason and refresh.
- Audit: `salon_application.approved`.

**A-04.3 Request info**
- When I click Request info, then ReasonDialog opens (see 00 §5). Confirm label "Send request".
- Given I choose a reason and confirm, then the API pauses the application, emails the owner and creates an in-app task. The status becomes Info requested, and a toast confirms.
- Given the reason is Other, then free text is required.
- Consequence note: "The owner gets an email and an in-app task. The application stays paused until they reply."

**A-04.4 Reject**
- When I click Reject, then ReasonDialog opens with a red confirm "Reject application".
- Given I confirm, then the owner is emailed the reason, and the salon cannot re-apply for 30 days (the API enforces the 30 days; the console only states it in the note).
- The row leaves the queue. Audit: `salon_application.rejected` with reason.

**A-04.5 Queue navigation**
- Given I finish one application, then the next one in the list is selected automatically.
- Given the list is empty, then show "No applications to review" with an illustration.

## Business rules
- The reason for Request info and Reject is shown to the salon owner. Preset labels must be owner-safe.
- An application can only be decided once. If another admin decided it first, the second admin gets a 409 and a refresh.
- Owner NIC and the registration document are sensitive. Display only in the viewer, never in logs or Sentry.
- Counts: sidebar badge and dashboard "Salon applications to review" use the same API number.

## Screen states
| State | Behaviour |
|---|---|
| Loading | List skeleton and detail skeleton |
| Empty | "No applications to review" (list), detail panel shows "Select an application" |
| Error | Inline card with retry |
| Forbidden | 403 page for Finance and Moderator |
| Partial | AI check not ready: show "AI check pending" in the panel and keep the actions enabled. Photos failing to load: placeholder tile with retry. |

## API (proposed)
- `GET /v1/admin/salon-applications?status=in_review&page=&sort=submitted_at` → `[{ id, salon_name, city, submitted_at, status }]`
- `GET /v1/admin/salon-applications/{id}` → `{ id, salon_name, address, lat, lng, owner{ name }, status, documents[{ type: business_registration|owner_nic|proof_of_address|photos, state: received|missing, count?, preview_url? }], ai_check{ summary, status, generated_at }, photos[{ url }] }`
- `POST /v1/admin/salon-applications/{id}/approve`
- `POST /v1/admin/salon-applications/{id}/request-info` body `{ reason_code, reason_text }`
- `POST /v1/admin/salon-applications/{id}/reject` body `{ reason_code, reason_text }`
- `GET /v1/admin/salon-applications/{id}/documents/{docId}` (signed URL, audited)

Gaps: the AI check as structured findings (so the UI could show per-document ticks instead of free text); the owner contact (email and phone are not in the mockup, nothing to mask); the map needs a provider (key in server env, no `NEXT_PUBLIC_`).

## Open questions
1. May an admin approve while a document is Missing (for example Glow Studio, proof of address missing)? Or does the API block it?
2. Does Request info let the admin add a free-text message to the owner beyond the preset reason?
3. Is there a deadline for the owner to reply before the application auto-closes?
4. Which map provider? Is the pin read-only?
5. Is the 30-day re-apply block configurable, or fixed copy?
6. Does an application show history (earlier info requests) when the owner replies?
