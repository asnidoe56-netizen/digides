-- Separates the Digiflazz-matching key from the admin-facing label.
-- categories.name stays exactly what Digiflazz sends (catalog-sync's
-- upsertCategory matches/creates rows by this column) and is no longer
-- editable from the Kategori page — renaming it used to spawn a duplicate
-- category on the next sync because sync could no longer find a match.
-- display_name is the free-text label an admin can set (e.g. "Isi Pulsa"
-- for the "Pulsa" category) shown to end users in place of the raw name;
-- NULL means "no custom label yet, show the raw name".
ALTER TABLE categories ADD COLUMN display_name text;
