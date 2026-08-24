-- Secondary indexes that support known query patterns (scheduled jobs,
-- dashboards, statements) but aren't already covered by a PK/UNIQUE/FK
-- index created inline in 002-012. Kept deliberately short — see M02
-- planning doc section 8 ("index hanya untuk FK yang sering di-JOIN/
-- filter, kolom yang dipakai job terjadwal, dan UNIQUE constraint").

-- transactions: pending-transaction-check job scans by status; wallet
-- statements/history scan by wallet + time.
CREATE INDEX transactions_status_created_idx ON transactions (status, created_at);
CREATE INDEX transactions_wallet_created_idx ON transactions (wallet_id, created_at DESC);

-- wallet_ledger: statement pagination per wallet, lookups by transaction
-- or idempotency/provider reference.
CREATE INDEX wallet_ledger_wallet_created_idx ON wallet_ledger (wallet_id, created_at DESC);
CREATE INDEX wallet_ledger_transaction_idx ON wallet_ledger (transaction_id);
CREATE INDEX wallet_ledger_reference_idx ON wallet_ledger (reference);

-- referral: commission engine walks the referrer chain upward.
CREATE INDEX referral_relationships_referrer_idx ON referral_relationships (referrer_id);

-- commission: per-beneficiary dashboard, per-transaction traceability.
CREATE INDEX commission_ledger_beneficiary_status_idx ON commission_ledger (beneficiary_user_id, status);
CREATE INDEX commission_ledger_transaction_idx ON commission_ledger (transaction_id);

-- catalog: dashboard filters.
CREATE INDEX products_status_idx ON products (status);
CREATE INDEX products_category_idx ON products (category_id);
CREATE INDEX products_brand_idx ON products (brand_id);

-- pricing: real-time markup resolution for a given owner/scope.
CREATE INDEX markup_rules_owner_idx ON markup_rules (owner_type, bumdes_id, konter_id, is_active);
CREATE INDEX markup_rules_scope_idx ON markup_rules (scope_type, category_id, brand_id, product_id);

-- governance: entity drill-down, per-actor audit trail, manual review queue.
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity, entity_id, created_at DESC);
CREATE INDEX audit_logs_actor_idx ON audit_logs (actor_user_id, created_at DESC);
CREATE INDEX reconciliation_records_category_idx ON reconciliation_records (category);
