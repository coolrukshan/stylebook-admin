# A-12 Admin roles · A-13 Audit log

Mockups: `A-12_admin_roles.png`, `A-13_audit_log.png`.

## A-12 Admin roles (`/roles`)

**Purpose:** control who can do what; see admin accounts, their 2FA state and last activity.
**Roles:** Super admin only (`admin.manage`).
**Stories:** US-A-04, US-A-04a. SRS: ADM-02, ADM-23.

Title "Who can do what in this console" (subtitle). Two cards and a footnote.

**Permission matrix:** rows are permissions, columns are roles (Super admin, Support, Finance, Moderator). Each cell is a checkbox (green check when granted). The demo values are in 00-shared §2. The footnote: "Super admin is locked to all permissions. Every permission change is written to the audit log."

Rows in the mockup: Approve salon applications · Suspend users · Reveal bank account numbers · Approve payout runs · Decide disputes and refunds · Change fees and commission · Moderate reviews and AI posts · Manage admins and roles.

**Admin list:** Admin · Role · 2FA ("On" or "Off · reminder sent") · Last active ("Now", "25 Oct").

### Acceptance criteria
- Given I am a Super admin, when I toggle a checkbox, then a ReasonDialog (assumption, since this is a permission change) opens. On confirm the API saves, the cell updates, and `role.permission_changed` is written with role, permission, old and new value, and reason.
- Super admin column: all checked and disabled (locked), with a lock icon and tooltip "Super admin always has every permission".
- Given I revoke a permission I use myself, then the change is allowed only on other roles. I cannot remove a permission from the role I am signed in as if it would lock out the last Super admin (Super admin is locked, so this applies to nothing else).
- Given a role changes, then affected admins' sessions pick it up within 15 minutes (access-token lifetime) or on next refresh. The API re-checks on every call.
- The checkbox grid is keyboard accessible (arrow keys between cells, Space to toggle). Each cell has an accessible name: "Support can suspend users".
- Given I am not a Super admin, then the page is hidden from the sidebar and a direct URL gives 403.
- Admin list: read-only in the mockup. The list shows 2FA status. "Off · reminder sent" means the API sent a reminder email. An admin with 2FA off should be highlighted (text plus icon).
- Adding, deactivating admins and changing an admin's role is **not shown**. US-A-04 covers only role permissions. **Open question 2.**
- Last active uses relative dates ("Now" if under 5 min) and "25 Oct" otherwise (Asia/Colombo).

### Screen states
Loading skeleton. Empty n/a. Error with retry. Forbidden 403. Partial: the matrix loads while the list fails.

### API (proposed)
- `GET /v1/admin/roles` → `{ permissions[{ key, label }], roles[{ key, label, locked, grants[] }] }`
- `PUT /v1/admin/roles/{role}/permissions/{permission}` body `{ granted, reason_code, reason_text }`
- `GET /v1/admin/admins` → `[{ id, name, role, two_factor: on|off, reminder_sent_at?, last_active_at }]`

### Open questions
1. Do permission changes need a reason (assumed)?
2. Where do admins get invited, assigned a role, or deactivated?
3. Can custom roles be created, or are the four fixed?
4. Should the matrix include the missing permissions (verify payout accounts, audit log, engagement, reports, A-15–A-19)?
5. What happens to an admin with 2FA off: blocked from sign-in (see A-01)?

## A-13 Audit log (`/audit`)

**Purpose:** append-only record of every admin action, filterable and exportable.
**Roles:** all admins can view (US-A-18, "any admin"; **open question**). Export: Super admin and Finance (assumption).
**Stories:** US-A-18. SRS: ADM-16.

Title "Audit log", subtitle "Every admin action, newest first". Table: **When · Admin · Action · IP**. Footnote "Append-only. Every approval, reveal, verification and suspension in this demo adds a row here."

Demo rows:
| When | Admin | Action | IP |
|---|---|---|---|
| Just now | Ayesha (Super admin) | Suspended user · Nimal Perera (reason: Spam or fake reviews) | 10.4.2.8 |
| 25 Oct, 09:12 | Dinusha (Support) | Approved salon application · Lotus Beauty Lounge | 10.4.2.17 |
| 24 Oct, 17:40 | Kamal (Finance) | Approved payout run week 42 · 109 salons | 10.4.2.31 |
| 24 Oct, 11:05 | Dinusha (Support) | Suspended user · Promo Deals LK (reason: spam reviews) | 10.4.2.17 |

### Acceptance criteria
- Given any admin write succeeds, then the API adds a row. The console never writes audit rows itself (it sends the reason to the API). The log shows the row on next load or via SSE.
- Rows are never edited or deleted. There are no row actions. The API exposes no update or delete.
- Each row: time with zone on hover or in full ("Sat 25 Oct, 9:12 AM (Asia/Colombo)"), admin first name and role in brackets, a sentence describing the action with the subject, and the reason in brackets when one exists, plus the IP (mono font).
- Filters (US text: "filter and export"; none in the mockup): date range, admin, action type, subject (user, salon, dispute id). Filters live in the URL (`nuqs`). Default: last 30 days (assumption). Sort: newest first only.
- Paging is server-side (cursor or page). The log can grow large.
- Given I click Export, then a CSV of the **current filter** streams from the API via `/api/export/audit`. The export is itself audited (`audit.exported`).
- Bank account and PII values never appear in audit rows (the row says "Revealed bank account · RedBox Barber", never the number). Subject names appear as the API provides.
- Reveal events (`bank_account.revealed`, `pii.revealed`) appear as rows. This is how US-A-08 is met.

### Screen states
Loading skeleton rows. Empty: "No audit entries match these filters". Error with retry. Forbidden: 403 if a role ever lacks view. Partial n/a.

### API (proposed)
- `GET /v1/admin/audit?from=&to=&admin_id=&action=&q=&cursor=` → `{ items[{ id, at, admin{ id, name, role }, action, subject{ type, id, label }, reason?, ip }], next_cursor }`
- `GET /v1/admin/audit/export?…` (CSV stream)

### Open questions
1. May every role see the full log (including IPs and other admins' actions), or only their own plus Super admin all?
2. How long is the log retained? Is there a legal requirement for the retention period?
3. Does the log include failed attempts and sign-ins (login, lock, unlock)?
4. Should "action" be a structured filter list? Needs the API's action enum.
5. IP of an admin behind the allowlist: show the internal IP (10.4.x.x) as in the mockup, or the original client IP from `X-Forwarded-For`?
