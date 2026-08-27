# DigiDes Pay — Source of Truth

Produced as part of the 2026-08-28 security audit (`docs/security/SECURITY_AUDIT.md`). Principle: **the frontend is never a source of truth.** It displays, accepts input, and sends requests; the server validates and decides; the database holds authoritative state; the external provider is authoritative only for its own transaction/payment status, and only once its signature is verified.

```
FRONTEND (display, input, request)
   ↓
API / SERVER (authorization, validation, business logic)
   ↓
DATABASE (authoritative state)
   ↓
EXTERNAL PROVIDER (authoritative for provider-side status only)
```

## Matrix

| Data | Source of Truth | Derived Data | Who may write |
|---|---|---|---|
| **Product (catalog)** | `products` table, mirrored from Digiflazz's price-list via `runCatalogSync` (bulk, capped at once/5min) and `getLiveProductPricing` (per-SKU live check, run per purchase attempt) | Buyer-facing category/provider catalog listing | Only the sync job and `getLiveProductPricing`'s self-healing snapshot write `base_price`/`status`; only Super Admin's `admin_disabled`/`merchandising_tag` actions write those two columns — never the buyer |
| **Supplier/base price** | Digiflazz's live price-list response | `products.base_price` (cached mirror) | Same as above — never client-writable |
| **Sell price** | Computed server-side: `base_price + effective markup`, where markup is resolved by `getEffectiveMarkupValue` (PRODUCT > BRAND > CATEGORY > GLOBAL priority) | Buyer catalog display; transaction charge | `markup_rules` table, written only via Super Admin's Markup menu endpoints (`api/markup/*`) |
| **Balance / Saldo** | `wallets.available_balance`/`held_balance`, derived from the append-only `wallet_ledger` (RESERVE/DEBIT/RELEASE/CREDIT/TOPUP), written inside Postgres transactions with `FOR UPDATE` row locking | Wallet summary cards, reports | Only `postLedgerEntry` (`wallet.repository.ts`), always inside `withTransaction()` — no route accepts a client-supplied balance value |
| **Transaction** | `transactions` table, status machine driven by `transitionTransactionStatus` (compare-and-swap) | Histori/Laporan views | Only `transaction.service.ts`; both the synchronous Digiflazz response path and the webhook path funnel through the same `applyDigiflazzResult` |
| **Transaction status** | Digiflazz's own response (`rc`/`status`) — synchronous or via a signature-verified webhook | UI status badges | Never client-supplied; a status is only accepted from Digiflazz directly or from a webhook whose HMAC-SHA1 signature has been verified |
| **Provider response** | The provider's own API/webhook payload, stored verbatim in `transaction_events.provider_raw_response` / `payments` rows | Audit trail, support investigation | Only accepted after signature verification (webhooks) or as the direct synchronous response to our own outbound call |
| **Commission** | Computed server-side by the commission engine from a SUCCESS transaction + the referral chain, written to `commission_ledger` | Commission reports | Only the post-transaction commission engine, or Super Admin's settle/payout actions — never client-suppliable |
| **User (identity)** | `users` table | `UserSummary`/session display data | `createUser` (registration flows), `updateUserProfile` (self, via `/api/account/profile`, or Super Admin, via `/api/users/[id]/profile` — both scoped: self can only ever target `session.userId`, Super Admin can target any id), `updateUserStatus` (Super Admin only) |
| **Role** | `user_roles` table, assigned once at account creation (`assignRole`) | `session.roles` (see gap below) | Only at creation time today — **there is no existing feature to change an existing user's role**, so this row is effectively write-once in the current app |
| **Tenant (bumdes/konter)** | `bumdes`/`konters` tables, `admin_user_id`/`operator_user_id` linking a tenant to exactly one login | Wallet/complaint/topup ownership resolution | Only `registerMitra` (bumdes) and the equivalent konter-provisioning flow; a tenant's identity is resolved server-side from `session.userId`, never accepted from a request body |

## Frontend → Database write paths, checked

For every row above, the write path was traced through the actual code (not assumed) during the audit:

- **Frontend → API → Database** — the only path that exists for any of the rows above. No table is exposed for direct client writes (no Supabase-style client SDK, no PostgREST, no direct DB connection string ever reaches the browser).
- **Provider → webhook → Database** — Digiflazz and Midtrans both reach the database only through a signature-verified webhook handler (`processDigiflazzWebhookEvent`, `processMidtransNotification`), never directly.
- **Database → frontend** — read paths (Server Components calling repositories directly, e.g. every `page.tsx` under `dashboard/`) are the only way data reaches the browser for display; there is no caching layer sitting between the database and the frontend that could serve stale/incorrect authoritative values (balance/price/status are always read fresh per request — `dynamic = "force-dynamic"` is set on every page that shows this kind of data).

**No case was found where the frontend acts as a source of truth for price, balance, transaction status, ownership, or permission.** This is the single most important finding of the audit's Phase 6, and it held up under direct code inspection across the wallet, transaction, catalog, and markup subsystems.

## Current architecture gap (documented, not fixed)

**Session `roles` are cached in the signed session cookie at login time and are not re-read from the database on subsequent requests.** `getSession()` re-validates session *validity* (revoked/expired/device-blocked/idle-timeout) against the database on every request, but not role *membership* — the `roles` array embedded in the HMAC-signed token at login is trusted as-is for the life of the session.

- **Current architecture:** `roles` = point-in-time snapshot from login, valid until the session itself expires/is revoked/idles out (up to 7 days).
- **Recommended architecture:** either (a) re-fetch `listRolesForUser(userId)` inside `getSession()` on every request (adds one more join to the existing session-validity query, since it already does a DB round trip anyway), or (b) at minimum, revoke all of a user's sessions whenever their role assignment changes, the same way SEC-02's recommended fix does for status changes.
- **Why this hasn't caused a real incident:** there is currently no feature anywhere in the app that changes an existing user's role after account creation — roles are assigned once at registration and never modified. This is a **latent** architectural gap, not an active vulnerability, and should be closed before any "change user's role" admin feature is built, not after.

## Provider trust boundary specifics

- Digiflazz price-list and transaction-status data is trusted only as the direct synchronous response to our own signed, authenticated outbound request, or via a webhook whose `X-Hub-Signature` HMAC-SHA1 (computed over the raw body with the configured Webhook Secret) has been verified with a constant-time comparison.
- Midtrans notification data is trusted only after its SHA-512 `signature_key` (computed from `order_id + status_code + gross_amount + server_key`) matches — currently via a non-constant-time comparison (SEC-04 in the audit; recommended fix pending).
- Neither integration ever treats an inbound HTTP request's mere arrival at the webhook URL as proof of authenticity — this was explicitly checked and confirmed for both.
