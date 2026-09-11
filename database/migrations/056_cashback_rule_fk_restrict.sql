-- Membetulkan kontradiksi di migrasi 055, ditemukan oleh uji ujung-ke-ujung.
--
-- 055 memberi cashback_ledger.cashback_rule_id `ON DELETE SET NULL`, dengan
-- alasan "aturannya boleh dihapus, catatan pembayarannya tidak boleh ikut
-- hilang". Tapi SET NULL adalah sebuah UPDATE atas baris cashback_ledger —
-- dan tabel itu dijaga trigger forbid_mutation() yang menolak UPDATE apa
-- pun. Hasilnya: menghapus aturan yang pernah membayar tidak menghapus
-- apa-apa, melainkan gagal dengan "cashback_ledger is append-only".
--
-- Jadi yang sebenarnya dijanjikan skema bukanlah yang ditulis komentarnya.
-- Pilihannya dua: melonggarkan trigger append-only, atau mengakui bahwa
-- aturan yang sudah pernah membayar memang tidak boleh dihapus.
--
-- Yang kedua yang benar. Baris cashback_ledger harus selalu bisa menjawab
-- "aturan mana yang membayar ini" — itu gunanya kolom tersebut — dan
-- jawaban NULL untuk sejarah yang sebenarnya diketahui adalah kehilangan
-- data yang disamarkan sebagai pembersihan. Panel admin memang tidak
-- pernah menawarkan hapus; hanya Nonaktifkan.
--
-- RESTRICT membuat penolakannya jujur dan langsung di tingkat foreign key,
-- dengan pesan yang menyebut hubungannya, alih-alih meledak di dalam
-- trigger dengan pesan yang menyesatkan. Aturan yang BELUM pernah membayar
-- tetap boleh dihapus.
ALTER TABLE cashback_ledger DROP CONSTRAINT cashback_ledger_cashback_rule_id_fkey;
ALTER TABLE cashback_ledger ADD CONSTRAINT cashback_ledger_cashback_rule_id_fkey
  FOREIGN KEY (cashback_rule_id) REFERENCES cashback_rules(id) ON DELETE RESTRICT;
