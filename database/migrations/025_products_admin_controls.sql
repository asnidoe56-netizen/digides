-- Two independent, admin-owned signals on top of Digiflazz's own
-- status (ACTIVE/GANGGUAN/DISABLED, refreshed by every catalog sync via
-- upsertProduct — see mapDigiflazzStatus in jobs/catalog-sync.ts):
--
-- admin_disabled: a manual "turn this off ourselves" switch, independent
-- of whatever Digiflazz reports. upsertProduct's ON CONFLICT clause never
-- touches this column, so a future sync can never silently re-enable a
-- product an admin turned off (or vice versa) — the same reasoning
-- upsertCategory already relies on for categories.status.
--
-- merchandising_tag: purely a storefront label an admin can set (Super
-- Murah / Promo / Terlaris) — has no bearing on purchasability.
ALTER TABLE products ADD COLUMN admin_disabled boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN merchandising_tag text
  CHECK (merchandising_tag IN ('SUPER_MURAH', 'PROMO', 'TERLARIS'));
