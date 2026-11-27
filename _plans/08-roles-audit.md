# Plan 08: Admin roles (A-12) and Audit log (A-13)

Spec: `_specs/08-roles-audit.md`. Mockups: `admin/A-12_admin_roles.png`, `admin/A-13_audit_log.png`.
API: `http://localhost:8000` (down when this plan was written). Facts below come from `src/lib/api/schema.d.ts` and the backend source `../StylebookAPI` (HEAD `9f7a658`; the roles, audit and permission files are unchanged from HEAD). Nothing was run against the API.
Depends on plans 00 to 07 (on `main`). Branch: `feature/roles-audit` (created from `main`). Do not commit unless asked.

## 0. What already exists

Nav items `/roles` (`admin.manage`) and `/audit` (`audit.view`), `DataTable` (cursor paging, `cursors` in the URL), `runAdminAction`, `requirePermission`, `useActionErrorHandler`, `formatAuditTime`, `formatShortDate`, `roleLabel`, `maskPii` (`features/search/mask-pii.ts`), nuqs, the document proxy route as the pattern for a download route. No checkbox component in `components/ui`.

## 1. API findings that change the spec

### Security (report to the API team before real admins are added)

| # | Finding (source) | Handling |
|---|---|---|
| S1 | `PUT /v1/admin/roles/{id}` needs only `roles.manage`. `update_admin_user` does **not** check who may assign `super_admin`, and does not validate role or permission values (only create checks the super_admin case). So **any admin with `roles.manage` can make themselves Super admin**, or edit other Super admins. | Console: only a signed-in Super admin can open or use the roles page; the console never sends `role`; it never **grants** `roles.manage` (it can remove it). This does not protect the API itself. |
| S2 | The audit CSV export writes free text (`reason`, written by admins, partners and clients) with no spreadsheet-formula escaping. | The console's export route neutralises cells that start with `=`, `+`, `-`, `@`, tab or CR. |
| S3 | The console calls the API from its server and forwards no client IP; the API's `trusted_proxy_count` defaults to 0. So **audit IPs for console actions are the console server's**, and the API's admin IP allow-list checks that server, not the admin. This affects every write since plan 00. | Not changed here (needs a deployment decision, open question 1). The audit footnote says so. |

### Roles (A-12)

| # | Finding | Handling |
|---|---|---|
| 1 | **There is no role permission matrix.** Permissions are a string array on **each admin account**. A role is only a label, except `super_admin`, which bypasses checks. | Replace the role-by-permission grid with the admin list plus an **"Edit access" dialog per admin**: a grouped checklist of that account's permissions. Nothing pretends that a role grants anything. |
| 2 | No endpoint lists permissions. The API checks 27 strings (`require_permission`). Matching is exact: `manage` does not include `read`. | One catalogue constant in the console (section 3, step 2), grouped by area. Some spec rows cannot be separated: bank-account reveal, account verification and payout runs are all `payouts.manage`. |
| 3 | `PUT` replaces the whole `permissions` array. No version check. No single-admin `GET`. | The action re-reads the admin just before writing and applies only the ticked and unticked changes, preserving unknown strings. Unticking removes the colon and `:write` aliases too. A small race remains. |
| 4 | **No reason field** on the update. The audit row `admin_user.update` stores the new values only, not the old ones. | Confirm dialog listing added and removed permissions; no reason dialog (it would be silently dropped), as in plan 06. Report the audit gap. |
| 5 | List: `GET /v1/admin/roles` -> `{items[id, email, full_name, role, permissions, is_active, totp_enabled, last_login_at, created_at], next_cursor}`. No reminder-sent and no last-active data. | Columns: Admin, Role, 2FA (On, or **Off** highlighted with icon and text; no "reminder sent"), **Last sign-in** (not "Last active"; "Never" if empty), Status (Active, Deactivated), Edit access. |
| 6 | Permissions are read from the database on every request. | Dialog says changes apply on the admin's next request (spec assumed 15 minutes). |
| 7 | The API can also create admins, change role, deactivate and reset 2FA. The spec shows none of these. | Not built (open question 3). |

### Audit (A-13)

| # | Finding | Handling |
|---|---|---|
| 8 | `GET /v1/admin/audit` filters: `actor_id, actor_role, action, target_type, target_id, from_date, to_date, cursor, limit<=100`. An `action` ending in "." matches by prefix. Newest first. | Filters in the URL. "Area" select maps to a prefix. No free-text search. Page size 50. |
| 9 | The log holds **partner, client and system actions too**, not only admins, and there is no "admins only" filter. | Column is "Who"; subtitle "Every recorded action, newest first"; role filter available. |
| 10 | Dates are **UTC days**, not Colombo days. | Labels say "From / To (UTC date)". Default: last 30 UTC days. Row times are shown in Asia/Colombo. |
| 11 | Entries have `actor_id`, `actor_role`, and `actor_email` that is usually empty. **No names** for actor or subject; only `target_type` and `target_id`. | Actor name comes from the admin list when the API allows the viewer to read it; otherwise "Support · 1a2b3c4d". System actor shows "System". Subject shows type and short id, linked to the user, dispute, payout run or application page when there is one. "History" link filters by that subject. |
| 12 | `meta` is arbitrary JSON (can hold account holder names and similar). `reason` is free text. | `meta` never reaches the browser. `reason` is masked on the server with `maskPii` (adjusted so ISO dates are not masked). |
| 13 | Export: `GET /audit/export` (same filters), max 10,000 rows (422 `MAX_EXPORT_EXCEEDED`). It needs only `audit.read` and **is not itself audited**. The file includes emails, IPs, reasons and `meta`. | Console route `GET /api/export/audit`; button only for Super admin and Finance (spec assumption; console-side only). Console logs the admin id. Report the missing `audit.exported` row. |
| 14 | No update or delete routes; database triggers reject both. | Footnote "Append-only. Rows can't be edited or deleted." |

## 2. Step 0: verify with a running API

When the API is up: list admins and audit rows as a Super admin, change permissions on a **test** admin only, check the resulting audit row, and export a small range. Check which actor roles and actions actually appear. Capture synthetic fixtures. If it stays down or there are no credentials, say so in the report. S1 must not be exercised against shared data.

## 3. Work breakdown

### Step 1. Permissions (`src/lib/auth/`)
- `admin.manage` -> `[]` (Super admin only, spec A-12; also hides nav and page from other holders of `roles.manage`). `audit.view` unchanged.
- `canExportAudit(me)`: `audit.view` and role `super_admin` or `finance`. Update the table-driven tests.

### Step 2. Roles feature (`src/features/roles/`)
- `catalogue.ts` (pure, tested): the 27 permissions with group, label and accepted API forms (reuse the alias rule from `permissions.ts`, exported once); `isGranted`, `applyChanges(current, grant, revoke)`.
- `schemas.ts` (Zod): admin item and list; change input (uuid, grant and revoke from the catalogue only, no overlap, at least one change, `roles.manage` not grantable).
- `queries.ts` (server): `getAdmins()` follows cursors (limit 50, at most 10 pages, with a note if more exist).
- `actions.ts`: `updateAdminAccess(adminId, grant, revoke, key)` (`admin.manage`, audit name `admin_user.update`): re-read, refuse a missing or Super admin target (409), send **only** `permissions`, `revalidatePath("/roles")`.

### Step 3. Roles screen (`src/app/(console)/roles/`)
- `page.tsx`: `requirePermission("admin.manage")`, `TopBar` "Admin roles" / "Who can do what in this console". `loading.tsx`, `error.tsx`.
- `AdminsTable` (server) and `AccessDialog` (client): native labelled checkboxes in fieldsets ("Support can suspend users" style accessible names using the admin's name), then a review step listing added and removed, then save. Super admin rows show a lock with "Super admin always has every permission" and no edit button. Save failure keeps the dialog open.
- Footnote: "Super admin is locked to all permissions. Every permission change is written to the audit log."

### Step 4. Audit feature (`src/features/audit/`)
- `schemas.ts` (Zod): entry and list; `filtersSchema` (invalid URL values ignored; from after to shows a message).
- `describe.ts` (pure, tested): action -> sentence for known admin actions, raw string otherwise; subject label and link; actor label; default date range.
- `queries.ts` (server): `getAuditPage(filters, cursor)` returns display rows only (no `meta`, no `actor_email`, masked reason); `getActorNames()` returns an empty map on 403.
- `csv.ts` (pure, tested): RFC 4180 parse and write with formula neutralising.
- `src/app/api/export/audit/route.ts`: read the Next 16 route handler docs first; check session and `canExportAudit`; validate filters; fetch upstream with the server token and a 60 s timeout; return attachment with `private, no-store` and `nosniff`; map `MAX_EXPORT_EXCEEDED` to a 422 message; log ids and status only.

### Step 5. Audit screen (`src/app/(console)/audit/`)
- `page.tsx`: `requirePermission("audit.view")`, `TopBar` "Audit log". Filter bar (From, To, Area, Role, Admin when names are available, active subject chip, Clear). Table When · Who · Action · IP; time in `<time>` with the full zoned value; reason in brackets; IP in mono. Changing a filter resets `cursors`. Empty "No audit entries match these filters". `loading.tsx`, `error.tsx`.
- `ExportButton` (client): fetches the route, saves the file, shows a toast on error.
- Footnote: "Append-only. Rows can't be edited or deleted. IP addresses are as recorded by the API; for console actions they may be the console server's address."

### Step 6. Tests and quality gates
- Unit: catalogue and `applyChanges` (aliases, unknown strings preserved), roles action (non-super refused, Super admin target refused, only `permissions` sent, `roles.manage` not grantable), audit filters, describe, CSV escaping, export route (401, 403, 422, headers).
- Component: admin table states, dialog review and failure, audit table without PII or `meta`, filters, empty state, export hidden for other roles, axe.
- Finish with `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, run the app and smoke-test signed-out `/roles`, `/audit` and `/api/export/audit`. Report honestly.

## 4. File map (new/changed)

```
src/features/roles/{catalogue.ts,schemas.ts,queries.ts,actions.ts,components/{admins-table,access-dialog}.tsx}
src/features/audit/{schemas.ts,describe.ts,csv.ts,queries.ts,components/{audit-table,audit-filters,export-button}.tsx}
src/app/(console)/roles/{page.tsx,loading.tsx,error.tsx}
src/app/(console)/audit/{page.tsx,loading.tsx,error.tsx}
src/app/api/export/audit/route.ts
src/lib/auth/permissions.ts (+ test)   src/features/search/mask-pii.ts (+ test)   src/lib/api/client.ts (timeout option)
(+ tests beside each module)
```

## 5. Open questions (defaults in brackets)

1. Should the console forward the admin's IP (`X-Forwarded-For`) and the API trust it? Depends on the CloudFront, load balancer and API topology; a wrong setting lets IPs be spoofed. [Not changed; footnote only.]
2. Should the API gain role-level defaults so the mockup's matrix is possible, or is per-admin access the design? [Per-admin editor.]
3. Inviting, deactivating, changing role and resetting 2FA (spec Q2): the API supports them. [Not built.]
4. API to restrict `super_admin` assignment, validate values, accept a reason, record old values and audit exports. [Reported; console limits what it can.]
5. May every admin with `audit.read` see all rows and IPs (spec Q1)? [Whatever the API allows.]
6. Retention period and whether sign-ins are logged (spec Q2, Q3). [Unknown; not claimed.]

## 6. Done criteria

- A Super admin sees every admin with role, 2FA, last sign-in and status, and can change a non-Super admin's permissions after reviewing the changes; everyone else gets the 403 page and no nav item.
- The console never sends a role, never grants `roles.manage`, and never drops permission strings it does not display.
- Admins with `audit.read` see the log with URL filters and server paging; no `meta`, no raw contact data in rows.
- Export works for Super admin and Finance, honours the filters, is formula-safe and explains the 10,000-row limit.
- Lint, typecheck, tests and build pass; security findings S1 to S3 and every API gap are listed in the report.
