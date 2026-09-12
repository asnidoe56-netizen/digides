-- Isi halaman depan, supaya bisa diubah tanpa membongkar kode.
--
-- Halaman depan adalah bagian Digides yang paling sering ingin diubah dan
-- paling jarang boleh menunggu: satu kalimat yang salah, satu foto yang
-- kedaluwarsa, satu jawaban FAQ yang berubah karena kebijakan usaha. Kalau
-- semuanya tertanam di dalam kode, setiap koreksi kecil berarti menunggu
-- penerapan ulang — dan pada akhirnya halaman itu dibiarkan salah karena
-- mengubahnya terlalu mahal.
--
-- Bentuknya SENGAJA hanya tiga tabel, bukan satu tabel per bagian. Tabel per
-- bagian berarti menambah bagian baru = menambah tabel = membongkar kode,
-- yaitu persis hal yang ingin dihindari.

-- ── Gambar ────────────────────────────────────────────────────────────────
CREATE TABLE landing_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Nama berkas di dalam MEDIA_STORAGE_DIR. Disusun server dari sidik jari
  -- isinya, tidak pernah diambil dari nama berkas yang dikirim peramban.
  file_name text NOT NULL UNIQUE,
  -- Nama asli dari komputer pengunggah, hanya untuk ditampilkan di daftar.
  original_name text NOT NULL,

  mime_type text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size > 0),
  width integer,
  height integer,

  -- Wajib diisi admin. Pembaca yang memakai pembaca layar, dan mesin
  -- pencari, hanya punya kalimat ini untuk tahu gambarnya tentang apa.
  alt_text text NOT NULL DEFAULT '',

  uploaded_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX landing_media_created_at_idx ON landing_media (created_at DESC);

-- ── Bagian halaman ────────────────────────────────────────────────────────
CREATE TABLE landing_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dipakai kode untuk menemukan bagian tertentu ('hero', 'faq'). Tidak
  -- bisa diubah dari halaman admin: mengubahnya akan memutus hubungan
  -- antara baris ini dan komponen yang menggambarnya.
  key text NOT NULL UNIQUE,

  -- Menentukan komponen mana yang menggambar bagian ini. Juga tidak bisa
  -- diubah admin — satu-satunya hal di tabel ini yang memang milik kode.
  kind text NOT NULL,

  -- Semua kolom di bawah ini boleh kosong: tiap jenis bagian memakai yang
  -- relevan saja. Bagian FAQ tidak punya kutipan, bagian pembuka tidak
  -- punya isi kedua.
  eyebrow text,
  title text,
  title_accent text,
  body text,
  body_secondary text,
  quote text,
  script_text text,

  media_id uuid REFERENCES landing_media(id) ON DELETE SET NULL,

  -- Hal-hal yang bentuknya berbeda tiap jenis bagian: label tombol, nilai
  -- bawaan kalkulator, tautan kaki halaman. Ditaruh di jsonb supaya
  -- menambah satu tombol tidak berarti menambah kolom.
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Menyembunyikan bagian tanpa menghapus isinya. Bagian Profil misalnya
  -- lebih baik disembunyikan daripada dihapus saat fotonya belum siap.
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,

  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX landing_sections_urutan_idx ON landing_sections (sort_order, key);

-- ── Butir di dalam bagian ─────────────────────────────────────────────────
-- Kartu masalah, langkah, tanya jawab, tautan menu, baris layanan di
-- kalkulator, dan profil orang — semuanya baris di tabel ini. Itu sebabnya
-- menambah profil konsultan IT tidak menyentuh kode sama sekali: ia baris
-- baru di bagian yang sudah ada, dengan tampilan yang sama persis seperti
-- profil direktur.
CREATE TABLE landing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES landing_sections(id) ON DELETE CASCADE,

  -- Satu bagian bisa memuat lebih dari satu daftar. Bagian Solusi punya
  -- daftar centang DAN daftar "apa yang Anda dapatkan"; keduanya hidup di
  -- sini, dipisahkan oleh kolom ini.
  group_key text NOT NULL DEFAULT 'utama',

  title text,
  subtitle text,
  body text,

  -- Nama ikon (lucide). Dipilih admin dari daftar tertutup di halaman
  -- admin, bukan diketik bebas — ikon yang tidak dikenal akan menjadi
  -- lubang kosong di halaman yang dibaca publik.
  icon text,

  media_id uuid REFERENCES landing_media(id) ON DELETE SET NULL,

  link_label text,
  link_url text,

  data jsonb NOT NULL DEFAULT '{}'::jsonb,

  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX landing_items_bagian_idx ON landing_items (section_id, group_key, sort_order);
