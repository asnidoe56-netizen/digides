-- Supports the automatic backup-SKU failover mechanism (amendment to
-- docs/architecture/FLOW_KERJA_DAN_BATASAN_KERJA_TRANSAKSI.md, rules #3/#8):
-- when Digiflazz answers "Gagal" for a still-RESERVED transaction,
-- applyDigiflazzResult may now swap product_id/base_price/idempotency_key
-- on that SAME row (instead of only ever releasing it) and resubmit
-- against another active SKU sharing the same (category_id, brand_id,
-- product_name) group — selling_price never changes, so the buyer is
-- never affected and sees only one final transaction.
--
-- original_product_id: the very first product this transaction was
-- created against, set once and never touched again — lets reporting
-- answer "was this transaction ever swapped?" via product_id <>
-- original_product_id, without having to inspect tried_product_ids.
--
-- tried_product_ids: every product_id attempted so far (the original,
-- then each backup in order), oldest first. Doubles as the exclusion
-- list for picking the next backup and as the audit trail shown on
-- Super Admin's transaction detail page.
ALTER TABLE transactions
  ADD COLUMN original_product_id uuid REFERENCES products(id),
  ADD COLUMN tried_product_ids uuid[] NOT NULL DEFAULT '{}';

-- Backfill: every existing row's history is just its own current product.
UPDATE transactions
SET original_product_id = product_id,
    tried_product_ids = ARRAY[product_id]
WHERE original_product_id IS NULL;
