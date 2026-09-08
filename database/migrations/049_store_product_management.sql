-- PRD Digides Toko §9c (Tahap 3.5): makes a warung's stock actually
-- manageable. Migration 046 deliberately narrowed store_inventory_events'
-- `reason` to just 'SALE' on the grounds that nothing else was built yet —
-- but that left stock able only to go DOWN: a warung that sold out its
-- opening stock could never restock it, which is daily operations, not a
-- speculative future feature. Widening the CHECK here is the same one-line
-- move wallet_ledger_type_check has taken twice (migrations 022, 048).
--
-- 'ADJUSTMENT' covers every non-sale movement in both directions: restock
-- (positive delta) and shrinkage/correction (negative delta) — mirroring
-- wallet_ledger's own ADJUSTMENT type, which likewise carries a signed
-- amount rather than splitting into two one-way types.
ALTER TABLE store_inventory_events DROP CONSTRAINT store_inventory_events_reason_check;
ALTER TABLE store_inventory_events ADD CONSTRAINT store_inventory_events_reason_check
  CHECK (reason IN ('SALE', 'ADJUSTMENT'));

-- Who moved the stock. A SALE identifies itself through order_id, but an
-- ADJUSTMENT has no order behind it, so without this column a manual
-- correction would be untraceable to a person — the same reason
-- wallet_ledger.created_by exists. Nullable because the SALE rows written
-- before this migration have no value to backfill with (production has
-- none today, but dev does).
ALTER TABLE store_inventory_events ADD COLUMN created_by uuid REFERENCES users(id);
