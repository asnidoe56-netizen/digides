# DigiDes Pay — Security & Data Integrity Audit

**Date:** 2026-08-28
**Scope:** Full source tree at `D:\digides-ppob` (git remote `github.com/asnidoe56-netizen/digides`, branch `main`, commit `76ab89e`), local PostgreSQL dev database, and GitHub repository configuration. Production VPS infrastructure (Nginx config, live database role grants, OS-level hardening) was **not** accessed during this audit — see "Blocked / Requires Access" at the end of each relevant section.
**Method:** Static code review, configuration inspection, database schema/metadata inspection, safe read-only verification (local dev environment only), GitHub API inspection via `gh`. No destructive testing, no production access, no real PPOB transactions submitted, no credential rotation performed.
**Baseline:** OWASP ASVS 5.0.0, OWASP Top 10:2025, OWASP API Security Top 10, NIST SP 800-218, GitHub security best practices, Least Privilege, Zero Trust, Defense in Depth.

---

## 1. Executive Summary

DigiDes Pay is a Next.js 16 + PostgreSQL PPOB (pulsa/e-money/wallet) platform with four roles (SUPER_ADMIN, BUMDES_ADMIN, KONTER, AFFILIATE), a Digiflazz product-purchase integration, and a Midtrans wallet top-up integration. The audit found **one CRITICAL finding** (server-only password hashes being sent to the browser through three specific, recently-added code paths), **one HIGH finding** (suspending/deleting a user does not revoke their already-active sessions), and a handful of MEDIUM/LOW findings around missing security headers, no general-purpose rate limiting, and GitHub repository hardening.

The parts of the system that matter most for a financial application — SQL query construction, wallet/transaction fund movement, webhook trust, session signing, and transaction idempotency — were audited in depth and found to be **soundly designed**: no SQL injection anywhere in ~20 repository files, every money-moving endpoint resolves the acting wallet from the server-side session (never from client input), both external webhooks (Digiflazz, Midtrans) verify a cryptographic signature before trusting any status claim, and the transaction engine uses an idempotency-key + compare-and-swap status machine that correctly prevents double-charging on retries.

**No critical vulnerability was identified in the transaction/wallet money-movement path itself.** The CRITICAL finding that was identified (password hash exposure) is a data-exposure bug in a very recently added admin feature, not a flaw in the core financial engine, and is narrow, well-understood, and inexpensive to fix.

## 2. Scope

**In scope:** `src/` (all application code), `database/migrations/*.sql` (schema), `package.json`/lockfile (dependencies), `next.config.ts`, `middleware.ts`, `.env.example`, git history, GitHub repository settings (branch protection, secret scanning, Dependabot) via `gh api`.

**Out of scope / not accessed this pass:** the production VPS (`digidespay.pro`) — its Nginx configuration, TLS configuration, OS firewall, production PostgreSQL role grants, and systemd service hardening were not inspected in this session. Findings that depend on production infrastructure are marked **BLOCKED — REQUIRES ACCESS** with the specific access needed.

## 3. Architecture (Phase 0 Inventory)

- **Frontend/Backend:** Single Next.js 16 App Router application (Server Components by default, `"use client"` only where interactive). No separate backend service — Route Handlers under `src/app/api/**/route.ts` (60 total) are the entire API surface.
- **Database:** PostgreSQL, raw `pg` driver (no ORM), all queries in `src/repositories/*.repository.ts` (20 files). Migrations are hand-written sequential SQL files in `database/migrations/`.
- **Auth:** Custom session system — signed (HMAC-SHA256), httpOnly, `SameSite=Lax` cookie (`digides_session`) whose payload embeds a `user_sessions` row id; every request re-validates that row (revoked/expired/device-blocked/idle-timeout) via one DB round trip (`src/lib/auth/session.ts`).
- **Authorization:** Per-route `getSession()`/`requireRole()` checks (no centralized middleware gate — `middleware.ts` is an intentional no-op placeholder, `matcher: []`).
- **External providers:** Digiflazz (prepaid product purchase + price-list), Midtrans (wallet top-up via Snap). Both have dedicated `src/lib/{digiflazz,midtrans}/*` clients and webhook signature verification.
- **Money flow:** `wallets`/`wallet_accounts` (balance) ← `wallet_ledger` (append-only RESERVE/DEBIT/RELEASE/CREDIT/TOPUP entries, the actual source of truth) ← `transaction.service.ts`'s state machine, all inside `withTransaction()` (Postgres transactions) with `FOR UPDATE` row locking on the wallet row for concurrent-safety.
- **Jobs:** `runCatalogSync` (Digiflazz price-list, manually triggered, now rate-limited to once/5min), `pending-transaction-check.ts` (polls RESERVED transactions).
- **CI/CD:** **None.** No `.github/workflows` directory exists — no automated build, test, lint, or security-scan gate runs on push or PR.
- **Deployment:** VPS (Nginx reverse proxy + Let's Encrypt TLS, systemd service on `127.0.0.1:3000`), per prior operational knowledge — not independently re-verified this pass.

## 4. Threat Model (Phase 18 — Trust Boundaries)

```
UNTRUSTED: Browser / attacker-controlled request
   ↓  (JSON only — no endpoint accepts form-encoded bodies)
Route Handler: getSession()/requireRole() — AuthN gate
   ↓
Service layer: ownership resolution (session.userId → wallet/bumdes/konter),
               zod input validation, business rules
   ↓
Repository layer: parameterized SQL only
   ↓
PostgreSQL: authoritative state (wallet_ledger, transactions, users)
   ↓
External provider (Digiflazz/Midtrans): authoritative for provider-side
               transaction status — only trusted after signature verification
```

Every price, balance, and transaction status value that matters is computed or verified **at the Service/Repository/Provider layer**, never accepted verbatim from the browser. This principle holds for the core financial path (see §9 Business Logic and §12 Source of Truth). The one confirmed violation of "never trust the browser" is the password-hash leak in §5 — data flowing the *wrong direction* (server → browser) rather than a manipulated-input problem.

## 5. Findings

Findings are numbered by severity. Full detail (evidence, attack scenario, fix) for each is in §10 below; this is the index.

| ID | Severity | Title |
|---|---|---|
| SEC-01 | **CRITICAL** | `password_hash` returned to the browser via 3 code paths |
| SEC-02 | **HIGH** | Suspending/deleting a user does not revoke their active sessions |
| SEC-03 | MEDIUM | `notifications/[id]/read` has no recipient ownership check (BOLA) |
| SEC-04 | MEDIUM | Midtrans webhook signature check is not constant-time |
| SEC-05 | MEDIUM | No general-purpose/edge rate limiting (login lockout is per-account only) |
| SEC-06 | MEDIUM | No security headers configured (CSP/HSTS/X-Frame-Options/etc.) |
| SEC-07 | LOW | No GitHub branch protection / required review on `main`; no CI |
| SEC-08 | LOW | Dependabot vulnerability alerts & security updates disabled |
| SEC-09 | LOW | Public GitHub repository for a financial application |
| SEC-10 | LOW | Account/phone enumeration via registration & profile-edit error messages |
| INFO-01 | INFO | No explicit CSRF token (currently mitigated by SameSite=Lax + JSON-only bodies) |
| INFO-02 | INFO | Local dev DB connects as the Postgres superuser role (prod role not re-verified) |

## 6. Frontend Security (Phase 1)

- No `NEXT_PUBLIC_*` environment variables exist anywhere in the codebase — nothing is deliberately exposed to the browser today.
- All app secrets (`AUTH_SECRET`, `CREDENTIALS_ENCRYPTION_KEY`, `DATABASE_URL`) are read exclusively in server-only files (`src/lib/db/pool.ts`, `src/lib/crypto/credentials.ts`, `src/lib/auth/session.ts`) — none in a `"use client"` file, none re-exported to a public var.
- Digiflazz/Midtrans credentials are correctly masked before ever reaching a Client Component (`getDigiflazzSettingsForDisplay` pattern) — the real API keys never leave the server.
- `console.log`/`console.error` usage is minimal (5 occurrences total) and confined to server-side job/service logs of error messages and transaction IDs — no tokens, payloads, or credentials logged.
- `next.config.ts` does not explicitly set `productionBrowserSourceMaps` — Next's default (`false`) applies, so this is not currently a leak, but it's implicit rather than explicit (see remediation).
- **SEC-01 (CRITICAL)** is a frontend-data-leakage finding: full `User` rows (including `password_hash`) reach both an API JSON response and a Client Component's RSC payload. See §10.

## 7. Authentication (Phase 2)

- Session cookie: `httpOnly`, `Secure` (in production), `SameSite=Lax`, HMAC-SHA256 signed, **constant-time** signature comparison (`timingSafeEqual` in `verifySessionToken`). Good.
- Session revocation is real: a session row (`user_sessions`) is checked on every request; `revoked_at`, `expires_at`, device `trust_status`, and idle-timeout are all enforced live, not just at login. Blocking a device takes effect on the very next request.
- Password hashing: `bcryptjs` (confirmed in `package.json`), verified via `verifyPassword`.
- Login brute-force: per-account lockout after `security_policies.max_login_attempts`, with a generic "Email atau password salah" error that does not reveal whether the account exists — no user-enumeration via login. **Verified good.**
- Transaction PIN brute-force: separately and correctly rate-limited with its own lockout + a `SECURITY_INCIDENT` record (`PIN_LOCKOUT`). **Verified good.**
- **SEC-02 (HIGH):** account status changes (Suspend/Delete) do not invalidate existing sessions. See §10.
- Session `roles` are embedded in the signed cookie at login time and are **not** re-read from the database on subsequent requests (only session validity/device/idle-timeout are re-checked). There is currently no UI feature that changes an existing user's role after creation, so this is not exploitable today, but it is an architectural gap worth closing before any future "change user role" feature ships — documented in `SOURCE_OF_TRUTH.md` as a CURRENT vs RECOMMENDED architecture item.

## 8. Authorization / IDOR / BOLA (Phase 3)

A dedicated pass was run across all 60 API routes, tracing every id-bearing endpoint through to its repository call. Full detail in the standalone finding SEC-03. Headline result:

**The two endpoints that actually move money — `POST /api/transactions/execute` and `POST /api/wallet/transfer` — never accept a wallet/tenant id from the client at all.** The acting wallet is always resolved server-side from `session.userId` via `getWalletForMitraSession`, and `wallet/transfer`'s recipient is constrained to the caller's own verified downline (`referral_relationships`), not an arbitrary wallet id. This is exactly the correct pattern and was the single most important thing to get right in this audit — confirmed correct.

Every other id-bearing SUPER_ADMIN-only route (users, brands, categories, markup, commissions, wallets, products, reconciliation, security, support) is intentionally global-scope by design (SUPER_ADMIN is the platform's only administrative tier — there is no second-tier "regional admin" that should be restricted to a subset of tenants), so role-membership-only checks there are not IDOR — a narrower object-ownership check would be a false requirement.

The one real gap: **SEC-03**, `PATCH /api/notifications/[id]/read` (see §10).

## 9. Multi-Tenant Isolation (Phase 4)

Ownership resolution for BUMDES_ADMIN/KONTER is centralized in `wallet.service.ts`'s `getWalletForMitraSession` and mirrored in `bumdes.service.ts`'s `submitMitraComplaint` (both resolve the tenant id from `session.userId` via `findBumdesByAdminUserId`/`findKonterByOperatorUserId`, never from client input). No endpoint reachable by BUMDES_ADMIN/KONTER/AFFILIATE accepts a `bumdesId`/`konterId`/`walletId` in its request body — confirmed by direct route inspection (§8). Tenant isolation for the money path is **sound**.

## 10. Detailed Findings

### SEC-01 — CRITICAL — `password_hash` returned to the browser

- **Affected files:**
  - `src/app/api/users/[id]/profile/route.ts:72` — `return NextResponse.json({ user: updated });` where `updated` is `updateUserProfile()`'s `RETURNING *` (full `users` row).
  - `src/app/api/account/profile/route.ts:73` — identical pattern for the self-service profile endpoint.
  - `src/app/dashboard/super-admin/users/[id]/page.tsx:36` — `const user = await findUserById(id)` (full row, `SELECT * FROM users`) is passed as `<UserEditProfileDialog user={user} />`, a `"use client"` component. TypeScript's `Pick<User, ...>` prop type does **not** strip extra fields from a variable at runtime (excess-property checking only applies to object literals) — the full object, including `password_hash` and `locked_until`, is serialized into the page's React Server Component payload and shipped to the browser.
- **Evidence:** `updateUserProfile` in `src/repositories/user.repository.ts` is defined as `UPDATE users SET ... RETURNING *`; `findUserById` is `SELECT * FROM users WHERE id = $1`. Both include `password_hash`.
- **Root cause:** these three code paths were added in this session's "Add user detail page and profile editing" and "WhatsApp/phone login" work; the existing safe pattern (`/api/users/search/route.ts` explicitly narrows to `{ id, full_name, email }`) was not replicated here.
- **Attack scenario:** Any Super Admin's browser — via devtools Network tab, "View Page Source" on the RSC payload, or simply saving the JSON response of a profile edit — obtains the bcrypt hash of any user they view or edit, and their own hash via the self-service endpoint. An attacker with any access to a Super Admin's browser (shared computer, browser extension, XSS in an unrelated part of the app, or a malicious admin) can exfiltrate hashes for offline cracking. Weak/reused passwords become directly recoverable.
- **Business impact:** Direct credential-confidentiality breach for every user account ever viewed/edited through the affected screens. In a financial app this is a severe trust failure even without a live exploit, because it violates the basic guarantee that hashed credentials never leave the server.
- **Recommended fix (not applied):** Change both API routes to return only `{ id, email, full_name, phone }` (or a small `toSafeUser()` helper used everywhere a `User` row would otherwise cross a trust boundary); change the detail page to pass `{ id: user.id, full_name: user.full_name, email: user.email, phone: user.phone }` into `UserEditProfileDialog` instead of the raw `user` object. Consider adding a lint rule or a repository-level "safe projection" helper so `SELECT *`/`RETURNING *` rows can never accidentally cross a Server→Client boundary again.
- **Verification method:** After the fix, re-run the same profile-edit flow and confirm via `curl`/devtools that the JSON response and RSC payload contain no `password_hash`/`locked_until` fields.
- **Status:** Open — documented only, not fixed (per audit ground rules).

### SEC-02 — HIGH — Suspending/deleting a user does not revoke active sessions

- **Affected files:** `src/app/api/users/[id]/route.ts` (Suspend/Activate/Delete action), `src/repositories/user-session.repository.ts`'s `findActiveSessionContext`, `src/lib/auth/session.ts`'s `getSession()`.
- **Evidence:** `findActiveSessionContext`'s query joins `user_sessions`, `user_devices`, and `security_policies` — it never references the `users` table or `users.status` at all:
  ```sql
  SELECT s.id, s.last_active_at, d.trust_status AS device_trust_status, p.session_timeout_minutes
  FROM user_sessions s
  JOIN user_devices d ON d.id = s.device_id
  CROSS JOIN security_policies p
  WHERE s.id = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
  ```
  `PATCH /api/users/[id]` (the Pengguna page's Tangguhkan/Aktifkan/Hapus action) only calls `updateUserStatus(id, status)` and writes an audit log — it never calls `revokeAllSessionsForUser`/`revokeAllSessionsForUserAndAudit`. That function exists and works correctly, but is wired **only** to a separate, manual action in the Security module's "Sesi Login" tab.
- **Root cause:** account-status enforcement and session-validity enforcement are two independent code paths that were never linked.
- **Attack scenario:** Super Admin discovers a compromised or fraudulent BUMDES_ADMIN/KONTER account and clicks "Hapus"/"Tangguhkan" expecting immediate lockout. The account's already-open browser session(s) keep working — full dashboard access, ability to initiate transactions/transfers if their PIN is still valid — until the session's idle-timeout or 7-day expiry lapses, unless the admin separately remembers to also go to Security → Sesi Login and revoke every device for that user.
- **Business impact:** Defeats the intuitive/expected effect of the most common incident-response action in the app (suspend a bad actor). Directly relevant to fraud response time in a financial platform.
- **Recommended fix (not applied):** Have `PATCH /api/users/[id]` call `revokeAllSessionsForUserAndAudit(id, ...)` whenever the new status is `SUSPENDED` or `DELETED` (or, more robustly, add a `users.status` check inside `findActiveSessionContext` itself so *any* future code path that changes status is automatically enforced, not just this one button).
- **Verification method:** Suspend a user with an active session open in another browser; confirm their next request is rejected.
- **Status:** Open.

### SEC-03 — MEDIUM (latent-HIGH) — `notifications/[id]/read` missing ownership check

- **Affected files:** `src/app/api/notifications/[id]/read/route.ts`, `src/services/notification.service.ts`'s `readNotification`, `src/repositories/notification.repository.ts`'s `markNotificationRead`.
- **Evidence:** the route only checks `getSession()` (any authenticated role, no `requireRole`), then calls `readNotification(id)` with the id taken straight from the URL. `markNotificationRead` is `UPDATE notifications SET is_read = true WHERE id = $1` — no `recipient_role` predicate. Its siblings (`GET /api/notifications`, `PATCH /api/notifications/read-all`) correctly filter by `recipient_role`; this single-item path dropped that filter.
- **Attack scenario:** Today all notification rows are `recipient_role = 'SUPER_ADMIN'` (only `notifySuperAdmin()` produces any), so impact is currently limited to a non-admin silently marking a Super Admin's alert (top-up request, complaint, reconciliation flag) as read before it's actually handled. The moment any tenant-facing notification producer ships (e.g. "your top-up was approved"), this becomes a direct cross-tenant BOLA — one BUMDES_ADMIN could suppress another's notifications.
- **Recommended fix (not applied):** `markNotificationRead` should take the caller's role/id and filter `WHERE id = $1 AND recipient_role = $2` (or an owner column, once/if per-user notifications exist), mirroring the already-correct pattern in `listNotifications`/`markAllNotificationsRead`.
- **Status:** Open.

### SEC-04 — MEDIUM — Midtrans webhook signature check is not constant-time

- **Affected file:** `src/lib/midtrans/client.ts`'s `verifyMidtransSignature` — `return expected === params.signatureKey;` (plain string equality).
- **Comparison:** the Digiflazz webhook verifier (`src/lib/digiflazz/webhook.ts`) does this correctly: `Buffer.from(...)` + length check + `crypto.timingSafeEqual`.
- **Impact:** theoretical timing side-channel on a 128-character hex SHA-512 digest comparison. Practically very hard to exploit over real network jitter, but it is an inconsistency between two otherwise-equivalent controls in the same codebase, and ASVS V6.2.5-class guidance calls for constant-time comparison of security-relevant values as a matter of course, not just when convenient.
- **Recommended fix (not applied):** mirror the Digiflazz implementation — `Buffer.from` both sides, length-check, `timingSafeEqual`.
- **Status:** Open.

### SEC-05 — MEDIUM — No general-purpose rate limiting

- **Evidence:** `middleware.ts` is an intentional no-op (`matcher: []`). Grepping the whole codebase for rate-limiting logic surfaces only: the login lockout (per-account, DB-based), the PIN lockout (per-account, DB-based), and the Digiflazz catalog-sync 5-minute guard added this session. No IP-based or global throttle exists anywhere.
- **Impact:** a distributed attacker trying many different account emails (rather than repeatedly guessing one account's password) never trips any lockout, since `countRecentFailedLogins` is keyed by the attempted email/identifier, not by source IP. Registration, product-browse, and most other endpoints have no throttle at all — not currently a demonstrated exploit path (no obviously abusable business action was found unprotected — PIN and login are the two obvious high-value targets and both are protected per-account), but it is a real defense-in-depth gap relative to the audit's own Phase 16 checklist.
- **Recommended fix (not applied):** add an edge-level rate limiter (e.g. token-bucket keyed by IP+route in `middleware.ts`, or a hosted solution) for `auth/login`, `auth/register`, and `transactions/execute` at minimum.
- **Status:** Open.

### SEC-06 — MEDIUM — No security headers configured

- **Evidence:** `next.config.ts` has no `headers()` function; no CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, or `Permissions-Policy` is set at the application layer.
- **BLOCKED — REQUIRES ACCESS:** whether the production Nginx reverse-proxy layer already sets some of these (HSTS is common alongside Let's Encrypt setups) was **not verified** in this audit — no Nginx config exists in this repository, and production SSH access was not used this pass. This finding should be re-scored after checking `nginx -T` (or the vhost file) on the VPS.
- **Recommended fix (not applied):** add explicit headers via `next.config.ts`'s `headers()` regardless of what Nginx does (defense in depth) — at minimum `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` or a `frame-ancestors 'none'` CSP directive, and `Referrer-Policy: strict-origin-when-cross-origin`.
- **Status:** Open — partially blocked pending infra check.

### SEC-07 — LOW — No branch protection / CI on `main`

- **Evidence:** `gh api repos/asnidoe56-netizen/digides/branches/main/protection` → `404 Branch not protected`. No `.github/workflows` directory exists.
- **Impact:** any push to `main` (including a compromised contributor credential, or an accidental force-push) goes live with zero required review and zero automated check (no test run, no build check, no lint, no dependency scan).
- **Recommended fix (not applied):** enable branch protection on `main` (require PR + at least one review, require the build to pass), and add a minimal GitHub Actions workflow that runs `tsc --noEmit`/`next build` on every PR.
- **Status:** Open.

### SEC-08 — LOW — Dependabot alerts disabled

- **Evidence:** `gh api repos/.../vulnerability-alerts` → disabled; `security_and_analysis.dependabot_security_updates.status` → `disabled`. `secret_scanning` and `secret_scanning_push_protection` **are** enabled (good).
- **Recommended fix (not applied):** enable Dependabot alerts and security updates in repository Settings → Code security.
- **Status:** Open.

### SEC-09 — LOW — Public repository

- **Evidence:** `gh api repos/asnidoe56-netizen/digides --jq .private` → `false`.
- **Impact:** the complete source of a live financial application — including exact validation rules, rate-limit thresholds, and internal design-rationale comments — is visible to anyone on the internet. No secrets were found in it (see §11), so this is not a direct credential-exposure risk, but it does materially help an attacker plan a logic-based attack and is unusual practice for an institutional-grade financial system.
- **Recommended fix (not applied):** consider making the repository private, or at minimum confirm this is an intentional, accepted risk.
- **Status:** Open — decision needed from the project owner, not a code fix.

### SEC-10 — LOW — Account enumeration on registration/profile endpoints

- **Evidence:** `/api/auth/register`, `/api/mitra` (mitra registration), `/api/users/[id]/profile`, and `/api/account/profile` all return a distinguishable `409 "Email/Nomor WhatsApp sudah terdaftar/digunakan"` versus a generic validation error, letting a caller test whether a given email/phone is already registered. (Login itself does **not** enumerate — verified good, see §7.)
- **Impact:** low — a common, generally-accepted trade-off for usability; only useful to an attacker as a reconnaissance step, not a direct account-takeover vector.
- **Recommended fix (optional):** if desired, return a generic "if this email is available you'll receive a confirmation" style response instead — usually not worth the UX cost for this class of app.
- **Status:** Open, low priority.

### INFO-01 — No explicit CSRF token

Currently mitigated in combination by (a) `SameSite=Lax` cookies, and (b) every state-changing route requiring `Content-Type: application/json`, which a plain cross-site HTML form cannot send. This is a reasonable, currently-effective pair of controls for a JSON-only API. Recorded as INFO because higher ASVS levels expect an explicit token as well; not an active vulnerability.

### INFO-02 — Local dev DB role is the Postgres superuser

Local `.env`/dev convention connects as `postgres` (superuser) rather than a scoped application role — a Least-Privilege gap in local tooling only. Session history indicates production uses a named role (`digides_user`) separate from the pre-existing `erp_bumdes_vps` project's role, but this was **not independently re-verified** in this pass (**BLOCKED — REQUIRES VPS/production DB ACCESS** to run `\du digides_user` / check `information_schema.role_table_grants`).

## 11. Secrets (Phase 12)

**Clean.** `.env`/`.env.local`/`.env.*.local` are gitignored and were never committed (verified against full git history — 31 commits total, checked in full, not sampled). Only `.env.example` is tracked, containing empty placeholders. No hardcoded API keys/passwords/tokens found anywhere in tracked source via targeted regex scan. GitHub secret scanning and push protection are both enabled, providing an additional backstop.

## 12. Dependencies / Supply Chain (Phase 13)

`npm audit --omit=dev` against the live npm registry: **0 vulnerabilities** across 224 resolved packages (123 prod, 47 dev, 79 optional). No `.github/workflows` exist, so there is nothing to review for Actions permissions/pinning at this time (see SEC-07 — this absence is itself the finding).

## 13. PostgreSQL / SQL Injection (Phase 5)

**Clean — verified in depth.** Every one of the 20 repository files was reviewed; every `db.query()` call site binds user-derived values through `$1..$n` placeholders. The only dynamically-interpolated SQL fragments found (`wallet.repository.ts`'s owner-type column selector, `product.repository.ts`'s join-alias parameter) are both constrained to a small, hardcoded set of literal strings chosen by internal ternary/switch logic — never derived from request input. No `eval`, `Function`, dynamic `require`/`import`, or `child_process`/`exec`/`spawn` usage exists anywhere in `src/`. No ORDER BY clause is ever built from unvalidated user input (all are fixed literals).

## 14. Transaction Integrity & Wallet Security (Phases 7–8)

Reviewed directly against this session's own knowledge of building the engine, re-confirmed by file inspection:

- Every purchase is atomic: `createTransaction` (idempotency-key UNIQUE constraint, retried inserts return the existing row rather than erroring) + `postLedgerEntry(RESERVE)` happen inside one `withTransaction()` Postgres transaction.
- A retried request with the same idempotency key never re-reserves or re-calls Digiflazz — `executeTransaction` explicitly checks `alreadyExisted` and, if still `RESERVED`, falls through to the same status-check logic a manual "Cek Status" click uses.
- Digiflazz's own `ref_id` reuse semantics (repeat = status check, not new purchase) are used as designed, not fought against.
- Wallet balance is never computed from a client-supplied `amount`; `getLiveProductPricing` (added this session, per Digiflazz's own rate-limit best practices) re-verifies price and availability with a live, single-SKU check immediately before `executeTransaction` reserves funds — the confirmation screen's displayed price and the actual charge cannot drift.
- `max_price` is now submitted on every Digiflazz transaction, capped at the amount already reserved — Digiflazz auto-rejects if their side's cost exceeds what was already collected from the buyer, closing the "provider price spike after we already charged the customer" loss scenario the audit brief specifically calls out.
- Webhook and synchronous-response paths for both Digiflazz and Midtrans share the exact same `applyDigiflazzResult`/status-transition code — there is no second, divergent path that could apply an unverified status.
- `transitionTransactionStatus` is a compare-and-swap (`WHERE status = 'RESERVED'`) — a race between the webhook and the synchronous response resolving the same transaction cannot double-capture or double-release.

**No critical transaction-integrity or wallet vulnerability was identified.**

## 15. Source of Truth Audit (Phase 6)

See the dedicated `docs/architecture/SOURCE_OF_TRUTH.md` for the full matrix. Summary: for every critical data type (product, price, balance, transaction, transaction status, commission, user), the authoritative write path is server-side (repository/service layer) and the frontend only ever displays/requests — confirmed by direct inspection of every write path in §13–14. The one architectural gap (session `roles` cached at login, not re-verified per-request) is documented there as CURRENT vs RECOMMENDED, not fixed.

## 16. Webhook Security (Phase 11)

Both webhook handlers verify a cryptographic signature before trusting any payload field, and both are idempotent (a resolved transaction/payment is a safe no-op on replay):

- **Digiflazz** (`src/lib/digiflazz/webhook.ts`): HMAC-SHA1 over the raw request body, `timingSafeEqual` comparison. Correct.
- **Midtrans** (`src/lib/midtrans/client.ts`): SHA-512 of `order_id+status_code+gross_amount+server_key`, but non-constant-time comparison — see SEC-04.

Neither webhook currently validates a timestamp/nonce for explicit replay-window enforcement, relying instead on the underlying transaction/payment's own status check (`if (payment.status !== "PENDING") return payment;`) for replay-safety — this is adequate given the idempotency design, so it is not listed as a separate finding.

## 17. Business Logic (Phase 17)

Checked against the specific scenarios the audit brief calls out:
- **Manipulating nominal/price via request body:** not possible — `executeTransaction`'s price is always `getLiveProductPricing`'s server-computed value; the client-supplied request body for `/api/transactions/execute` only contains `productId`/`customerNumber`/`pin`/`idempotencyKey` (verified via its zod schema) — there is no `price`/`amount` field for a client to submit at all.
- **Double transaction / replay:** prevented by the idempotency-key design (§14).
- **Using another tenant's transaction/wallet:** prevented — see §8–9.
- **Manipulating commission:** commission is computed server-side post-transaction-success by the commission engine, not client-suppliable.
- **Discount/refund reuse:** no discount/refund self-service feature currently exists to abuse.

No business-logic vulnerability allowing unauthorized financial gain was identified in this pass.

## 18. Risk Matrix

| Severity | Count |
|---|---|
| CRITICAL | 1 |
| HIGH | 1 |
| MEDIUM | 4 |
| LOW | 4 |
| INFO | 2 |

## 19. Security Maturity

**Level: 3 — Controlled**, on a 0–5 scale (0 Unsafe, 1 Basic, 2 Developing, 3 Controlled, 4 Strong, 5 Institutional Grade).

Rationale: the highest-risk surface for a PPOB/wallet application — money movement, tenant isolation, SQL construction, provider-webhook trust, and transaction idempotency — is soundly engineered and shows evidence of deliberate, repeated security reasoning in code comments and design (e.g. the RESERVE/DEBIT/RELEASE ledger pattern, the max_price safeguard, the live-price re-check). What holds it at "Controlled" rather than "Strong" is: one CRITICAL data-exposure bug in a recently-added admin feature, one HIGH gap in incident-response effectiveness (session revocation on suspend), the complete absence of a CI/branch-protection safety net, and no edge-level rate limiting or security headers — all fixable without architectural change.

## 20. Final Verdict

**CONDITIONALLY READY.**

Not "not ready for production" — the core financial engine has no critical flaw. Not "ready with only low-risk findings" — SEC-01 (password hash exposure) and SEC-02 (sessions outlive account suspension) are both CRITICAL/HIGH, user-facing, and should be remediated before this is called production-ready for an institutional financial deployment. Once SEC-01 and SEC-02 are fixed and verified, and SEC-03–SEC-06 are addressed or explicitly risk-accepted, this application would meet a "READY WITH LOW-RISK FINDINGS" bar.

## 21. Top 10 Risks

1. SEC-01 — `password_hash` exposed to the browser (CRITICAL)
2. SEC-02 — suspended/deleted users keep their active sessions (HIGH)
3. SEC-03 — notification mark-read BOLA, latent cross-tenant (MEDIUM)
4. SEC-06 — no security headers, unverified against production Nginx (MEDIUM)
5. SEC-05 — no edge-level/IP-based rate limiting (MEDIUM)
6. SEC-04 — non-constant-time Midtrans signature comparison (MEDIUM)
7. SEC-07 — no branch protection or CI gate on `main` (LOW)
8. SEC-08 — Dependabot alerts disabled (LOW)
9. SEC-09 — public repository for a financial application (LOW)
10. SEC-10 — registration/profile enumeration (LOW)

## 22. Top 10 Recommended Actions

1. Fix SEC-01 immediately: narrow all three `User`-row exposure points to safe field sets.
2. Fix SEC-02: wire session revocation into the Suspend/Delete action (or gate `getSession()` on `users.status`).
3. Add the `recipient_role`/ownership filter to `markNotificationRead` (SEC-03).
4. Switch `verifyMidtransSignature` to `timingSafeEqual` (SEC-04) — mirror the Digiflazz implementation.
5. Add an edge-level rate limiter for `auth/login`, `auth/register`, `transactions/execute` (SEC-05).
6. Add explicit security headers in `next.config.ts`, and separately audit the production Nginx vhost for HSTS/CSP (SEC-06).
7. Enable branch protection on `main` (require PR review) and add a minimal CI workflow (SEC-07).
8. Enable Dependabot vulnerability alerts and security updates (SEC-08).
9. Decide and document whether the public-repo posture (SEC-09) is intentional.
10. Independently verify the production database's role grants follow least privilege (INFO-02) — requires VPS access, get explicit approval before connecting.

---

*"No critical vulnerability was identified within the transaction/wallet money-movement path." A critical vulnerability (SEC-01) was identified in the user-profile administration feature and is documented above.*
