-- Berkas APK aplikasi mitra yang diunggah Super Admin, dan diunduh publik
-- dari halaman depan.
--
-- Yang disimpan di tabel ini adalah CATATAN rilisnya, bukan berkasnya.
-- Berkas APK-nya (28-31 MB) berada di luar basis data dan di luar folder
-- aplikasi — lihat APK_STORAGE_DIR. Menaruh 30 MB biner di dalam Postgres
-- akan ikut masuk ke setiap pg_dump harian dan membuat cadangan yang
-- sebelumnya beberapa megabita menjadi ratusan, demi berkas yang tidak
-- punya hubungan apa pun dengan data keuangan.

CREATE TABLE app_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Versi seperti yang dilihat mitra di layar pembuka aplikasi: "1.11.4"
  -- dan nomor build "4144". Keduanya diisi admin saat mengunggah, karena
  -- membacanya dari dalam APK berarti membongkar AndroidManifest biner —
  -- pekerjaan besar untuk dua angka yang sudah ada di tangan pengunggah.
  version_name text NOT NULL,
  version_code integer NOT NULL,

  -- Nama berkas di dalam APK_STORAGE_DIR. Bukan jalur lengkap: jalurnya
  -- berbeda antara laptop dan server, dan menyimpan jalur absolut berarti
  -- basis data yang dipulihkan di tempat lain menunjuk ke folder yang tidak
  -- ada.
  file_name text NOT NULL UNIQUE,
  file_size bigint NOT NULL CHECK (file_size > 0),

  -- Supaya "berkas yang diunduh warga" bisa dibuktikan sama dengan "berkas
  -- yang diunggah admin". Kalau isinya berubah tanpa lewat halaman ini,
  -- sidik jarinya tidak lagi cocok.
  checksum_sha256 text NOT NULL,

  -- Ditulis admin: apa yang berubah di versi ini. Boleh kosong.
  release_notes text,

  -- Hanya SATU rilis yang aktif, dan itulah yang diunduh dari halaman depan.
  -- Rilis lama sengaja tidak dihapus otomatis: kalau versi baru ternyata
  -- rusak, mengembalikan yang lama harus semudah satu klik.
  is_active boolean NOT NULL DEFAULT false,

  uploaded_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Dua rilis aktif berarti dua jawaban untuk pertanyaan "APK mana yang
-- diunduh orang". Basis data yang menolaknya lebih baik daripada kode yang
-- berjanji menjaganya.
CREATE UNIQUE INDEX app_releases_hanya_satu_aktif
  ON app_releases (is_active)
  WHERE is_active;

-- Satu kombinasi versi hanya boleh ada sekali, supaya daftar rilis tidak
-- berisi tiga baris "1.11.4 (4144)" yang tidak bisa dibedakan.
CREATE UNIQUE INDEX app_releases_versi_unik
  ON app_releases (version_name, version_code);

CREATE INDEX app_releases_created_at_idx ON app_releases (created_at DESC);
