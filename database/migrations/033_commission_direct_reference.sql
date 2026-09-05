-- Moves the commission engine from percentage-of-price, multi-level
-- referral chains to flat-nominal, direct-reference-only rewards whose
-- rate depends on the referrer's own holder_status (USER vs MITRA) rather
-- than how deep they sit in a chain. See M18-follow-up design notes.

-- "Mitra" becomes a status a referral_codes owner holds, independent of
-- their user_roles — any AFFILIATE, BUMDES_ADMIN, or KONTER can be either
-- USER or MITRA. Existing BUMDes admins are backfilled to MITRA since they
-- were always real business partners, not incidental referrers.
ALTER TABLE referral_codes
  ADD COLUMN holder_status text NOT NULL DEFAULT 'USER' CHECK (holder_status IN ('USER', 'MITRA'));

UPDATE referral_codes
SET holder_status = 'MITRA'
WHERE user_id IN (SELECT admin_user_id FROM bumdes);

-- FLAT sits alongside PERCENTAGE, never replacing it — the one rule active
-- today keeps working unchanged (commission_type defaults to PERCENTAGE,
-- its existing percentage value is untouched).
ALTER TABLE commission_rules
  ALTER COLUMN percentage DROP NOT NULL;

ALTER TABLE commission_rules
  ADD COLUMN commission_type text NOT NULL DEFAULT 'PERCENTAGE' CHECK (commission_type IN ('PERCENTAGE', 'FLAT')),
  ADD COLUMN flat_amount numeric(14, 0) CHECK (flat_amount >= 0),
  ADD COLUMN applies_to_holder_status text CHECK (applies_to_holder_status IN ('USER', 'MITRA'));

ALTER TABLE commission_rules
  ADD CONSTRAINT commission_rules_amount_matches_type CHECK (
    (commission_type = 'PERCENTAGE' AND percentage IS NOT NULL) OR
    (commission_type = 'FLAT' AND flat_amount IS NOT NULL)
  );
