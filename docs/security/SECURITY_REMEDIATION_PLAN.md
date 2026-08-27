# DigiDes Pay — Security Remediation Plan

Source: `docs/security/SECURITY_AUDIT.md` (2026-08-28 audit). Ordered CRITICAL → HIGH → MEDIUM → LOW. Nothing in this plan has been applied yet — this is the queue, pending explicit go-ahead per finding.

| Priority | Finding | Severity | Component | Fix | Status |
|---|---|---|---|---|---|
| 1 | SEC-01 | CRITICAL | `api/users/[id]/profile`, `api/account/profile`, `super-admin/users/[id]` page | Narrow every `User` row to `{id, email, full_name, phone}` before it crosses an API response or a Server→Client Component prop boundary; add a shared "safe user" projection helper to prevent recurrence | **Fixed** (`edf3a7d`) — `PublicUserProfile` + `toPublicUserProfile()` added, all 3 boundaries updated, verified no `password_hash` in either PATCH response or the detail page's HTML; issue #6 closed |
| 2 | SEC-02 | HIGH | `api/users/[id]/route.ts`, `lib/auth/session.ts` | Call `revokeAllSessionsForUserAndAudit` when status → SUSPENDED/DELETED, or check `users.status` inside `findActiveSessionContext` so it's enforced everywhere automatically | **Fixed** (`1fdc092`) — did both: `findActiveSessionContext` now requires `u.status = 'ACTIVE'` (closes the gap for every current/future status-changing path automatically), and the Suspend/Delete action also explicitly revokes sessions for an accurate Security > Sesi Login list; verified an already-open mitra session was rejected on its very next request with no new login; issue #7 closed |
| 3 | SEC-03 | MEDIUM | `api/notifications/[id]/read`, `notification.repository.ts` | Add `recipient_role` (or owner) predicate to `markNotificationRead`, matching `listNotifications`/`markAllNotificationsRead` | Open |
| 4 | SEC-04 | MEDIUM | `lib/midtrans/client.ts` | Replace `===` with `crypto.timingSafeEqual` (mirror `lib/digiflazz/webhook.ts`) | Open |
| 5 | SEC-05 | MEDIUM | `middleware.ts` | Add IP-keyed rate limiting for `auth/login`, `auth/register`, `transactions/execute` at minimum | Open |
| 6 | SEC-06 | MEDIUM | `next.config.ts` + production Nginx vhost | Add `headers()` (CSP/HSTS/X-Content-Type-Options/X-Frame-Options/Referrer-Policy); separately verify/patch the Nginx layer | Open — partially blocked pending infra check |
| 7 | SEC-07 | LOW | GitHub repo settings, `.github/workflows/` | Enable branch protection + required review on `main`; add a CI workflow running `tsc --noEmit`/`next build` | Open |
| 8 | SEC-08 | LOW | GitHub repo settings | Enable Dependabot vulnerability alerts + security updates | Open |
| 9 | SEC-09 | LOW | GitHub repo visibility | Decide/document whether public visibility is intentional | Open — owner decision |
| 10 | SEC-10 | LOW | `auth/register`, `mitra`, profile-edit routes | Optional: generic response instead of "sudah terdaftar" to reduce enumeration | Open — low priority |
| 11 | INFO-01 | INFO | N/A | Consider an explicit CSRF token for higher ASVS assurance levels; not currently exploitable | Open — optional |
| 12 | INFO-02 | INFO | Production PostgreSQL | Verify production DB connects as a scoped role, not superuser (`\du`, `information_schema.role_table_grants`) | Open — **requires VPS/production DB access, get approval first** |

## Sequencing notes

- **Do SEC-01 and SEC-02 first and separately** — they're the only two findings with direct, user-facing security impact today. Each is a small, isolated change (a handful of lines) with no risk of touching money-movement logic.
- SEC-03 and SEC-04 are next: both are narrow, single-function fixes with clear existing correct patterns elsewhere in the same codebase to copy from.
- SEC-05 and SEC-06 are infrastructure/cross-cutting — size the work before starting (rate limiting needs a storage decision — in-memory is not viable across multiple server instances; confirm current deployment topology first).
- SEC-07–SEC-10 are GitHub/process changes, not application code — can be done independently of any code deploy, at any time, by whoever has repository admin access.
- INFO-02 requires production access and should not proceed without explicit user approval, consistent with the audit's read-only ground rules.
