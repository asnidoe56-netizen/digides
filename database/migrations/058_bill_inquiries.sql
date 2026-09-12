-- PRD Pascabayar §6.2 & §6.3; dokumen terkunci §5f. Hasil cek tagihan.
--
-- Cek tagihan BUKAN transaksi: ia tidak me-RESERVE saldo dan tidak membuat
-- baris `transactions`. Kebanyakan cek tagihan tidak berakhir dibayar —
-- pelanggan kaget melihat dendanya, uangnya kurang, atau nomornya salah.
-- Kalau setiap cek tagihan me-RESERVE, buku besar akan penuh pasangan
-- RESERVE/RELEASE yang tidak pernah menjadi apa-apa, dan laporan "transaksi
-- gagal" kehilangan artinya (PRD §7.1).

CREATE TABLE bill_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lahir di sini, lalu dipakai ULANG sebagai transactions.idempotency_key
  -- saat dibayar: Digiflazz mewajibkan pay-pasca memakai ref_id yang sama
  -- dengan inq-pasca (§5f aturan 2). UNIQUE supaya satu hasil cek tagihan
  -- tidak pernah bisa punya dua ref_id.
  ref_id text NOT NULL UNIQUE,

  user_id uuid NOT NULL REFERENCES users(id),
  wallet_id uuid NOT NULL REFERENCES wallets(id),
  product_id uuid NOT NULL REFERENCES products(id),

  -- Snapshot, bukan dibaca ulang saat membayar: status-pasca wajib memakai
  -- kode produk dan nomor pelanggan yang sama dengan pay-pasca, sedangkan
  -- katalog bisa berubah di antara keduanya (§5f batasan 4).
  buyer_sku_code text NOT NULL,
  customer_no text NOT NULL,
  -- PBB/SAMSAT mengirim dua bagian yang digabung koma; disimpan terpisah
  -- supaya layar rincian bisa menampilkannya kembali seperti yang diisi.
  input_parts jsonb,
  -- {year} untuk PBB, {amount} untuk E-Money pascabayar.
  extra_params jsonb,

  status text NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
  rc text,
  message text,

  customer_name text,
  periode text,
  bill_sheets integer,
  admin_fee numeric(14, 0),
  -- Yang dipotong dari deposit Digides; menjadi transactions.base_price.
  provider_price numeric(14, 0),
  -- Harga jual saran Digiflazz (tagihan + admin).
  provider_selling_price numeric(14, 0),
  -- Biaya layanan Digides saat cek tagihan; ikut dibekukan supaya aturan
  -- markup yang berubah setelahnya tidak mengubah angka yang sudah dilihat.
  service_fee numeric(14, 0),
  -- Yang dibayar mitra; menjadi transactions.selling_price dan nilai RESERVE.
  total_amount numeric(14, 0),
  -- Respons `desc` apa adanya: bentuknya berbeda untuk tiap jenis tagihan.
  bill_desc jsonb,
  raw_response jsonb NOT NULL,

  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Cek tagihan yang gagal memang tidak punya angka. Yang sukses wajib
  -- punya, karena angka itulah yang nanti menahan saldo mitra — lebih baik
  -- ditolak di sini daripada menghasilkan RESERVE tanpa dasar.
  CONSTRAINT bill_inquiries_sukses_wajib_berangka CHECK (
    status = 'FAILED'
    OR (provider_price IS NOT NULL AND provider_price >= 0
        AND total_amount IS NOT NULL AND total_amount > 0)
  )
);

CREATE INDEX bill_inquiries_user_created_idx ON bill_inquiries (user_id, created_at DESC);
-- Cek ulang produk + nomor yang sama dalam 60 detik memakai hasil sebelumnya,
-- sesuai permintaan Digiflazz sendiri (PRD §7.15, §7.17).
CREATE INDEX bill_inquiries_product_customer_idx ON bill_inquiries (product_id, customer_no, created_at DESC);

-- Append-only, seperti tabel keuangan lain: hasil cek tagihan adalah BUKTI
-- apa yang dilihat mitra sebelum membayar, dan bukti tidak boleh bisa diubah.
CREATE TRIGGER trg_bill_inquiries_immutable
BEFORE UPDATE OR DELETE ON bill_inquiries
FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- Pagar kedua di samping idempotency_key: satu hasil cek tagihan paling
-- banyak menghasilkan SATU transaksi. RESTRICT, bukan SET NULL — pelajaran
-- dari migrasi 056: SET NULL adalah UPDATE atas tabel append-only.
ALTER TABLE transactions
  ADD COLUMN bill_inquiry_id uuid UNIQUE REFERENCES bill_inquiries(id) ON DELETE RESTRICT;
