-- Super Admin's Markup menu sets one nominal (Rupiah) markup per category
-- (owner_type='MASTER', scope_type='CATEGORY') applied on top of the
-- Digiflazz base_price. This partial unique index lets the repository
-- upsert that single active rule per category with a plain
-- `INSERT ... ON CONFLICT ... DO UPDATE` instead of a read-then-write
-- race, and stops two active master/category rules for the same category
-- from ever coexisting.
CREATE UNIQUE INDEX markup_rules_master_category_active_uidx
  ON markup_rules (category_id)
  WHERE scope_type = 'CATEGORY' AND owner_type = 'MASTER' AND is_active = true;
