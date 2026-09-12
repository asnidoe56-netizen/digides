-- PRD Pascabayar §6.1. Memisahkan katalog pascabayar dari prabayar.
--
-- Diperiksa 12 September 2026: hari ini nama-namanya BELUM bertabrakan —
-- seluruh produk pascabayar Digiflazz berada di satu kategori "Pascabayar"
-- dengan brand PLN PASCABAYAR / INTERNET PASCABAYAR / PDAM / Telkomsel Omni,
-- dan tidak satu pun bentrok dengan 19 kategori serta 19 brand prabayar.
--
-- Pemisahan tetap dikerjakan karena tiga alasan yang tidak bergantung pada
-- nama (PRD §7.9):
--   1. Produk pascabayar tidak punya harga (base_price = 0). Kalau ia terbaca
--      jalur prabayar mana pun, mitra melihat produk berharga nol.
--   2. Aturan markup GLOBAL hari ini berlaku ke SEMUA produk (PRD §7.10).
--   3. Nama kategori itu milik Digiflazz, bukan milik kita. Mereka bisa
--      mengubahnya menjadi "PLN" atau "TV" kapan saja, dan tabrakannya baru
--      ketahuan setelah produk bercampur di layar mitra.
--
-- Semua baris yang sudah ada otomatis PREPAID. Tidak ada backfill, dan tidak
-- ada satu pun perilaku prabayar yang berubah karena migrasi ini.

ALTER TABLE categories ADD COLUMN product_type text NOT NULL DEFAULT 'PREPAID'
  CHECK (product_type IN ('PREPAID', 'POSTPAID'));
ALTER TABLE brands ADD COLUMN product_type text NOT NULL DEFAULT 'PREPAID'
  CHECK (product_type IN ('PREPAID', 'POSTPAID'));
ALTER TABLE products ADD COLUMN product_type text NOT NULL DEFAULT 'PREPAID'
  CHECK (product_type IN ('PREPAID', 'POSTPAID'));

-- Keunikan nama menjadi PER JENIS. Nama constraint lamanya tidak ditebak:
-- dicari dari katalog sistem, yaitu constraint UNIQUE yang kolomnya persis
-- (name) saja. Kalau namanya berbeda di server lain, migrasi ini tetap benar.
DO $$
DECLARE
  nama_tabel text;
  c record;
BEGIN
  FOREACH nama_tabel IN ARRAY ARRAY['categories', 'brands'] LOOP
    FOR c IN
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class cl ON cl.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = cl.relnamespace
      WHERE cl.relname = nama_tabel
        AND ns.nspname = current_schema()
        AND con.contype = 'u'
        AND (
          SELECT array_agg(att.attname::text ORDER BY att.attname::text)
          FROM unnest(con.conkey) AS k(attnum)
          JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k.attnum
        ) = ARRAY['name']
    LOOP
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', nama_tabel, c.conname);
      RAISE NOTICE 'constraint unik lama dihapus: %.%', nama_tabel, c.conname;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE categories ADD CONSTRAINT categories_name_type_key UNIQUE (name, product_type);
ALTER TABLE brands ADD CONSTRAINT brands_name_type_key UNIQUE (name, product_type);

-- Dari price-list pascabayar; NULL untuk produk prabayar. `admin` adalah
-- biaya admin yang ditagihkan ke pelanggan, `commission` adalah keuntungan
-- Digides per transaksi sebelum biaya layanan tambahan.
ALTER TABLE products ADD COLUMN admin_fee numeric(14, 0);
ALTER TABLE products ADD COLUMN provider_commission numeric(14, 0);

-- Katalog mitra selalu menyaring jenis + status bersamaan.
CREATE INDEX products_type_status_idx ON products (product_type, status);
