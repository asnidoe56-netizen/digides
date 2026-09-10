-- PRD Cashback §4. Mitra membayar harga normal; begitu transaksinya
-- SUCCESS, sebagian uangnya kembali ke saldo utamanya.
--
-- Yang TIDAK disentuh migrasi ini, dan tidak boleh disentuh nanti:
-- markup_rules, products.base_price, transactions.selling_price. Cashback
-- bukan potongan harga — ia hadiah sesudah transaksi selesai, dan mesin
-- harga tidak tahu-menahu tentangnya (PRD §2).

-- Bentuknya sengaja meniru markup_rules (migrasi 005): cakupan yang sama,
-- exclusive-arc yang sama, priority/effective_from/effective_until yang
-- sama. Admin yang sudah memahami menu Markup akan langsung memahami menu
-- Cashback tanpa mempelajari model kedua.
--
-- Satu perbedaan yang disengaja: TIDAK ada owner_type. Markup punya
-- pemilik (MASTER/BUMDES/KONTER) karena tiap tingkat boleh menaikkan
-- harganya sendiri. Cashback selalu dibayar dari margin Digides pusat, dan
-- membiarkan BUMDes memasang cashback dari margin orang lain adalah cara
-- membuat kerugian yang tidak seorang pun merasa menyebabkannya.
CREATE TABLE cashback_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  scope_type text NOT NULL CHECK (scope_type IN ('GLOBAL', 'CATEGORY', 'BRAND', 'PRODUCT')),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,

  -- NOMINAL: rupiah tetap per transaksi sukses.
  -- PERCENTAGE: persen dari MARGIN Digides pada transaksi itu, bukan dari
  -- harga jual (PRD §6.3). 10% dari harga jual Rp5.510 adalah Rp551 —
  -- lebih besar dari seluruh marginnya Rp500, jadi setiap transaksi akan
  -- rugi. Mesin komisi sudah memakai dasar yang sama.
  cashback_type text NOT NULL CHECK (cashback_type IN ('NOMINAL', 'PERCENTAGE')),
  cashback_value numeric(14, 4) NOT NULL CHECK (cashback_value >= 0),

  -- Keduanya nullable, dan 0 berarti "tidak ada batas" — bukan "batasnya
  -- nol". Perbedaan ini pernah jadi bug nyata di mesin komisi (lihat
  -- catatan minTransaction/maxCommission di commission.service.ts), jadi
  -- pembacanya wajib memeriksa `> 0`, bukan sekadar truthiness.
  min_transaction numeric(18, 0),
  max_cashback numeric(18, 0),

  priority smallint NOT NULL DEFAULT 0,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cashback_rules_scope_exclusive_arc CHECK (
    (scope_type = 'GLOBAL' AND category_id IS NULL AND brand_id IS NULL AND product_id IS NULL) OR
    (scope_type = 'CATEGORY' AND category_id IS NOT NULL AND brand_id IS NULL AND product_id IS NULL) OR
    (scope_type = 'BRAND' AND brand_id IS NOT NULL AND category_id IS NULL AND product_id IS NULL) OR
    (scope_type = 'PRODUCT' AND product_id IS NOT NULL AND category_id IS NULL AND brand_id IS NULL)
  )
);

CREATE TRIGGER trg_cashback_rules_updated_at
BEFORE UPDATE ON cashback_rules
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX cashback_rules_active_idx ON cashback_rules (is_active, scope_type);
CREATE INDEX cashback_rules_product_idx ON cashback_rules (product_id) WHERE product_id IS NOT NULL;

-- Satu baris per cashback yang benar-benar dibayarkan.
--
-- transaction_id UNIQUE adalah jaminan utamanya, bukan pemeriksaan di
-- kode: satu transaksi hanya bisa menghasilkan satu cashback, SELAMANYA,
-- dijamin basis data. Alasannya sama dengan
-- store_settlements.idempotency_key — percobaan ulang yang terjadi karena
-- timeout tidak boleh membayar dua kali, dan disiplin pemrogram bukan
-- tempat yang tepat untuk menyimpan jaminan tentang uang.
--
-- cashback_rule_id sengaja nullable dengan ON DELETE SET NULL: aturannya
-- boleh dihapus admin bertahun-tahun kemudian, dan catatan pembayaran yang
-- sudah terjadi tidak boleh ikut hilang bersamanya.
CREATE TABLE cashback_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL UNIQUE REFERENCES transactions(id),
  beneficiary_user_id uuid NOT NULL REFERENCES users(id),
  wallet_id uuid NOT NULL REFERENCES wallets(id),
  cashback_rule_id uuid REFERENCES cashback_rules(id) ON DELETE SET NULL,
  amount numeric(18, 0) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cashback_ledger_beneficiary_idx ON cashback_ledger (beneficiary_user_id, created_at DESC);
CREATE INDEX cashback_ledger_created_at_idx ON cashback_ledger (created_at DESC);

-- Append-only, seperti kelima tabel keuangan lainnya. Cashback yang sudah
-- dibayar adalah peristiwa yang sudah terjadi; membetulkannya dilakukan
-- dengan baris ADJUSTMENT di wallet_ledger, bukan dengan mengubah sejarah.
CREATE TRIGGER trg_cashback_ledger_immutable
BEFORE UPDATE OR DELETE ON cashback_ledger
FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- Gerakan satu baris yang sama sudah dilakukan tiga kali sebelumnya
-- (migrasi 022, 048, 050).
ALTER TABLE wallet_ledger DROP CONSTRAINT wallet_ledger_type_check;
ALTER TABLE wallet_ledger ADD CONSTRAINT wallet_ledger_type_check
  CHECK (type IN (
    'TOPUP', 'DEBIT', 'RESERVE', 'RELEASE', 'REFUND', 'COMMISSION', 'PAYOUT',
    'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN', 'SALE_OUT', 'SALE_IN',
    'STORE_SETTLEMENT_OUT', 'STORE_SETTLEMENT_IN', 'CASHBACK'
  ));
