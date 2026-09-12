-- Isi bawaan halaman depan.
--
-- Dijalankan ulang setiap kali `npm run db:seed` dipanggil, dan sengaja
-- memakai ON CONFLICT DO NOTHING: sesudah admin mengubah sebuah kalimat dari
-- halaman Kelola Halaman Depan, seed ini tidak boleh mengembalikannya.
-- Yang ditanam di sini hanya titik awal, bukan kebenaran.
--
-- Semua teks di bawah berasal dari pratinjau rancangan yang disetujui.
-- Bagian Profil sengaja lahir dalam keadaan tersembunyi: fotonya belum ada,
-- dan bagian profil tanpa foto lebih baik tidak tampil daripada tampil
-- setengah jadi.

-- ── Pengaturan situs ──────────────────────────────────────────────────────
INSERT INTO landing_sections (key, kind, title, body, script_text, settings, sort_order) VALUES
  ('situs', 'situs',
   'DIGIDES PAY',
   'Mitra Desa, Untuk Indonesia',
   'Desa Maju Karena Kemitraan',
   jsonb_build_object(
     'seo_title', 'DIGIDES PAY — Jadikan BUMDes sebagai Mitra Warga',
     'seo_description', 'Pulsa, token listrik, pembayaran tagihan, dan isi saldo e-wallet — layanan yang dicari warga setiap hari, dijual dari BUMDes atau warung Anda sendiri.',
     'hak_cipta', 'DIGIDES PAY. Semua hak dilindungi.',
     'tombol_masuk', 'Masuk',
     'tombol_daftar', 'Daftar Jadi Mitra',
     'url_masuk', '/login',
     'url_daftar', '/register'
   ),
   0)
ON CONFLICT (key) DO NOTHING;

-- ── Menu ──────────────────────────────────────────────────────────────────
INSERT INTO landing_sections (key, kind, title, sort_order) VALUES
  ('navigasi', 'navigasi', 'Menu halaman', 1)
ON CONFLICT (key) DO NOTHING;

INSERT INTO landing_items (section_id, title, link_url, sort_order)
SELECT s.id, x.judul, x.tautan, x.urut
FROM landing_sections s,
     (VALUES
       ('Beranda', '#beranda', 10),
       ('Tentang', '#tentang', 20),
       ('Manfaat', '#manfaat', 30),
       ('Hitung Potensi', '#hitung', 40),
       ('Cara Kerja', '#cara-kerja', 50),
       ('FAQ', '#faq', 60)
     ) AS x(judul, tautan, urut)
WHERE s.key = 'navigasi'
  AND NOT EXISTS (SELECT 1 FROM landing_items i WHERE i.section_id = s.id);

-- ── Pembuka ───────────────────────────────────────────────────────────────
INSERT INTO landing_sections (key, kind, eyebrow, title, title_accent, body, script_text, settings, sort_order) VALUES
  ('hero', 'hero',
   'Kemitraan adalah kunci membangun desa',
   'Jadikan BUMDes',
   'sebagai Mitra Warga.',
   'Bersama masyarakat, wujudkan desa yang lebih mandiri, produktif, dan sejahtera. DIGIDES PAY hadir untuk menghubungkan BUMDes, warga, dan peluang usaha dalam satu ekosistem digital.',
   'Desa Maju
Karena Kemitraan',
   jsonb_build_object(
     'tombol_utama', 'Daftar Jadi Mitra',
     'tombol_utama_url', '/register',
     'tombol_kedua', 'Unduh Aplikasi',
     'tombol_kedua_url', '/api/app/download',
     'kartu_judul', 'Lebih Dekat
Lebih Kuat
Lebih Sejahtera',
     'pita_tangan', 'Mitra Desa,
Untuk Indonesia'
   ),
   10)
ON CONFLICT (key) DO NOTHING;

INSERT INTO landing_items (section_id, title, sort_order)
SELECT s.id, x.judul, x.urut
FROM landing_sections s,
     (VALUES ('Tanpa Modal Besar', 10), ('Proses Mudah', 20), ('Pendampingan Penuh', 30))
     AS x(judul, urut)
WHERE s.key = 'hero'
  AND NOT EXISTS (SELECT 1 FROM landing_items i WHERE i.section_id = s.id);

-- ── Realita di lapangan ───────────────────────────────────────────────────
INSERT INTO landing_sections (key, kind, eyebrow, title, title_accent, body, body_secondary, quote, sort_order) VALUES
  ('realita', 'narasi',
   'Realita di lapangan',
   'Apakah Anda',
   'Pengurus BUMDes?',
   'Apakah Anda sudah merencanakan usaha dengan baik namun masih dianggap tidak berpihak pada warga?',
   'Program sudah dibuat. Usaha sudah dijalankan. Anggaran sudah disiapkan. Namun, mengapa warga masih merasa BUMDes belum hadir untuk mereka?',
   'Sudah banyak usaha yang direncanakan, namun warga masih merasa BUMDes belum hadir untuk mereka.',
   20)
ON CONFLICT (key) DO NOTHING;

INSERT INTO landing_items (section_id, title, icon, sort_order)
SELECT s.id, x.judul, x.ikon, x.urut
FROM landing_sections s,
     (VALUES
       ('Warga kurang tertarik', 'users', 10),
       ('Usaha belum berkembang', 'chart', 20),
       ('Hubungan dengan warga belum kuat', 'link', 30),
       ('Pendapatan belum maksimal', 'coins', 40)
     ) AS x(judul, ikon, urut)
WHERE s.key = 'realita'
  AND NOT EXISTS (SELECT 1 FROM landing_items i WHERE i.section_id = s.id);

-- ── Apakah ini yang terjadi di BUMDes Anda? ───────────────────────────────
INSERT INTO landing_sections (key, kind, eyebrow, sort_order) VALUES
  ('masalah', 'kartu', 'Apakah ini yang terjadi di BUMDes Anda?', 30)
ON CONFLICT (key) DO NOTHING;

INSERT INTO landing_items (section_id, title, body, sort_order)
SELECT s.id, x.judul, x.isi, x.urut
FROM landing_sections s,
     (VALUES
       ('Usaha berjalan, warga belum merasa terlibat',
        'Usaha BUMDes mungkin sudah berjalan, tetapi apakah masyarakat merasa mendapatkan manfaat dan memiliki alasan untuk terus berhubungan dengan BUMDes?', 10),
       ('Program ada, tetapi kebutuhan warga berbeda',
        'Tidak semua program yang terlihat baik di atas kertas otomatis menjadi sesuatu yang benar-benar dibutuhkan masyarakat.', 20),
       ('BUMDes ingin berkembang, warga justru menjauh',
        'Ketika masyarakat tidak menemukan manfaat dalam kesehariannya, hubungan dengan BUMDes sulit tumbuh menjadi sebuah kebiasaan.', 30),
       ('Pendapatan belum menjadi ekosistem',
        'Usaha dapat menghasilkan pendapatan, tetapi tantangannya adalah bagaimana aktivitas tersebut terus berputar bersama masyarakat.', 40)
     ) AS x(judul, isi, urut)
WHERE s.key = 'masalah'
  AND NOT EXISTS (SELECT 1 FROM landing_items i WHERE i.section_id = s.id);

-- ── Pergeseran cara pandang ───────────────────────────────────────────────
INSERT INTO landing_sections (key, kind, body, body_secondary, script_text, settings, sort_order) VALUES
  ('pergeseran', 'pergeseran',
   'Mungkin BUMDes Anda tidak membutuhkan lebih banyak program.',
   'Mungkin BUMDes',
   'Ketika Warga Menjadi Mitra,
Desa Ikut Melangkah.',
   jsonb_build_object('sorotan', 'Anda membutuhkan lebih banyak kemitraan.'),
   40)
ON CONFLICT (key) DO NOTHING;

INSERT INTO landing_items (section_id, title, sort_order)
SELECT s.id, x.judul, x.urut
FROM landing_sections s,
     (VALUES ('Warga Sejahtera', 10), ('BUMDes Kuat', 20), ('Desa Maju', 30)) AS x(judul, urut)
WHERE s.key = 'pergeseran'
  AND NOT EXISTS (SELECT 1 FROM landing_items i WHERE i.section_id = s.id);

-- ── Solusi ────────────────────────────────────────────────────────────────
INSERT INTO landing_sections (key, kind, eyebrow, title, title_accent, body, script_text, settings, sort_order) VALUES
  ('solusi', 'solusi',
   'Solusi untuk BUMDes',
   'Saatnya Bangkit
Bersama',
   'DIGIDES PAY.',
   'Bukan hanya aplikasi, tapi kemitraan untuk desa yang lebih maju. Anda tidak perlu modal besar, cukup komitmen dan semangat membangun desa bersama warga.',
   'Mulai Langkah Baru
Bersama Digides',
   jsonb_build_object(
     'judul_manfaat', 'Apa yang Anda Dapatkan?',
     'catatan_hp', 'Contoh tampilan — angka bukan data nyata',
     'saldo_contoh', 'Rp 1.250.000'
   ),
   50)
ON CONFLICT (key) DO NOTHING;

INSERT INTO landing_items (section_id, group_key, title, sort_order)
SELECT s.id, 'centang', x.judul, x.urut
FROM landing_sections s,
     (VALUES ('Tanpa biaya pendaftaran', 10), ('Tanpa modal besar', 20), ('Didampingi sampai bisa', 30))
     AS x(judul, urut)
WHERE s.key = 'solusi'
  AND NOT EXISTS (SELECT 1 FROM landing_items i WHERE i.section_id = s.id AND i.group_key = 'centang');

INSERT INTO landing_items (section_id, group_key, title, body, icon, sort_order)
SELECT s.id, 'manfaat', x.judul, x.isi, x.ikon, x.urut
FROM landing_sections s,
     (VALUES
       ('Layanan yang Dibutuhkan Warga', 'Menjadi alasan warga selalu bertransaksi di BUMDes Anda.', 'users', 10),
       ('Potensi Pendapatan Berkelanjutan', 'Setiap transaksi membuka peluang pendapatan baru.', 'chart', 20),
       ('Kemitraan dengan Warga', 'Warga bukan hanya pelanggan, tetapi mitra dalam menggerakkan desa.', 'handshake', 30),
       ('Mudah Digunakan dan Didampingi', 'Aplikasi sederhana, ada pelatihan dan pendampingan hingga bisa berjalan.', 'settings', 40)
     ) AS x(judul, isi, ikon, urut)
WHERE s.key = 'solusi'
  AND NOT EXISTS (SELECT 1 FROM landing_items i WHERE i.section_id = s.id AND i.group_key = 'manfaat');

-- ── Kalkulator potensi ────────────────────────────────────────────────────
-- Tiap baris layanan adalah butir, jadi menambah layanan ketiga (misalnya
-- Bayar Tagihan) cukup dari halaman admin. `basis` menentukan angka mana
-- yang dipakai: 'rumah' atau 'hp'.
INSERT INTO landing_sections (key, kind, eyebrow, title, title_accent, body, settings, sort_order) VALUES
  ('kalkulator', 'kalkulator',
   'Hitung dengan angka desa Anda',
   'Berapa Potensi',
   'Pendapatan BUMDes Anda?',
   'Kami tidak tahu desa Anda — Anda yang tahu. Isi angkanya di bawah ini, dan lihat berapa yang terkumpul kalau sebagian warga mulai berbelanja lewat BUMDes.',
   jsonb_build_object(
     'penduduk', 1200, 'rumah', 300, 'hp', 300, 'persen', 30,
     'label_penduduk', 'Jumlah penduduk',
     'label_rumah', 'Jumlah rumah',
     'label_hp', 'Pengguna HP Android',
     'label_persen', 'Berapa persen yang bisa Anda edukasi?',
     'catatan', 'Angka di atas hanya mengalikan apa yang Anda isi sendiri. Berapa warga yang benar-benar berpindah kebiasaan ditentukan oleh pendampingan dan waktu, bukan oleh rumus. Besar fee juga berbeda tiap produk dan mengikuti harga penyedia.',
     'tombol', 'Mulai dari Angka Ini',
     'tombol_url', '/register'
   ),
   60)
ON CONFLICT (key) DO NOTHING;

INSERT INTO landing_items (section_id, title, body, icon, data, sort_order)
SELECT s.id, x.judul, x.isi, x.ikon, x.data::jsonb, x.urut
FROM landing_sections s,
     (VALUES
       ('Token Listrik',
        'Dasarnya jumlah rumah — tiap rumah punya meteran sendiri',
        'zap',
        '{"basis":"rumah","fee":1000,"frekuensi":1,"warna":"emas","satuan":"rumah"}', 10),
       ('Pulsa & Paket Data',
        'Dasarnya pengguna HP — satu orang bisa beli berkali-kali',
        'smartphone',
        '{"basis":"hp","fee":300,"frekuensi":4,"warna":"merah","satuan":"orang"}', 20)
     ) AS x(judul, isi, ikon, data, urut)
WHERE s.key = 'kalkulator'
  AND NOT EXISTS (SELECT 1 FROM landing_items i WHERE i.section_id = s.id);

-- ── Langkah ───────────────────────────────────────────────────────────────
INSERT INTO landing_sections (key, kind, title, body, script_text, sort_order) VALUES
  ('langkah', 'langkah',
   'Bagaimana Memulainya?',
   'Langkah mudah untuk BUMDes yang lebih dekat dengan warga.',
   'Tidak perlu menunggu sempurna,
untuk memulai. Mulailah,
dan rasakan perubahannya.',
   70)
ON CONFLICT (key) DO NOTHING;

INSERT INTO landing_items (section_id, title, body, sort_order)
SELECT s.id, x.judul, x.isi, x.urut
FROM landing_sections s,
     (VALUES
       ('Daftar Jadi Mitra', 'Proses mudah dan cepat.', 10),
       ('Ikuti Pendampingan', 'Kami dampingi hingga siap.', 20),
       ('Mulai Layani Warga', 'Gunakan aplikasi DIGIDES PAY.', 30),
       ('Bangun Ekosistem Desa', 'Transaksi meningkat, pendapatan bertumbuh.', 40)
     ) AS x(judul, isi, urut)
WHERE s.key = 'langkah'
  AND NOT EXISTS (SELECT 1 FROM landing_items i WHERE i.section_id = s.id);

-- ── Profil perusahaan ─────────────────────────────────────────────────────
-- Lahir tersembunyi. Begitu foto dan datanya diisi dari halaman admin,
-- tinggal dinyalakan. Menambah profil konsultan IT nanti = menambah satu
-- butir di sini, dengan tampilan yang sama persis seperti profil direktur.
INSERT INTO landing_sections (key, kind, eyebrow, title, title_accent, body, is_visible, sort_order) VALUES
  ('profil', 'profil',
   'Orang di balik Digides',
   'Dikelola Orang yang',
   'Bisa Anda Temui.',
   'Desa membangun kepercayaan lewat orang, bukan lewat merek. Berikut mereka yang bertanggung jawab atas Digides.',
   false,
   80)
ON CONFLICT (key) DO NOTHING;

-- ── Masa depan desa ───────────────────────────────────────────────────────
INSERT INTO landing_sections (key, kind, title, body, script_text, sort_order) VALUES
  ('masa-depan', 'penutup',
   'Lebih dari Transaksi,
Ini Tentang Masa Depan Desa.',
   'DIGIDES PAY membantu BUMDes membangun hubungan yang lebih kuat dengan warga, menggerakkan ekonomi desa, dan menciptakan peluang baru yang berkelanjutan.',
   'Bersama DIGIDES PAY,
kita bangun desa yang lebih mandiri,
lebih sejahtera, dan lebih erat
antara BUMDes dan warganya.',
   90)
ON CONFLICT (key) DO NOTHING;

INSERT INTO landing_items (section_id, title, icon, sort_order)
SELECT s.id, x.judul, x.ikon, x.urut
FROM landing_sections s,
     (VALUES
       ('Desa Lebih Hidup', 'home', 10),
       ('Ekonomi Lebih Bergerak', 'chart', 20),
       ('Warga Lebih Sejahtera', 'users', 30),
       ('Masa Depan Lebih Cerah', 'sun', 40)
     ) AS x(judul, ikon, urut)
WHERE s.key = 'masa-depan'
  AND NOT EXISTS (SELECT 1 FROM landing_items i WHERE i.section_id = s.id);

-- ── Tanya jawab ───────────────────────────────────────────────────────────
INSERT INTO landing_sections (key, kind, title, body, sort_order) VALUES
  ('faq', 'faq',
   'Pertanyaan yang Sering Ditanyakan',
   'Jawaban apa adanya, sesuai keadaan sistem hari ini.',
   100)
ON CONFLICT (key) DO NOTHING;

INSERT INTO landing_items (section_id, title, body, sort_order)
SELECT s.id, x.tanya, x.jawab, x.urut
FROM landing_sections s,
     (VALUES
       ('Berapa modal awalnya?',
        'Tidak ada biaya pendaftaran dan tidak ada setoran wajib. Modalnya adalah saldo yang Anda isi sendiri, dan besarnya Anda yang menentukan. BUMDes bisa memulai dari jumlah kecil, lalu menambah setelah melihat perputarannya.', 10),
       ('Apakah ada biaya bulanan?',
        'Tidak ada. DIGIDES PAY mengambil bagian dari selisih harga pada setiap transaksi yang berhasil, bukan dari iuran. Kalau tidak ada transaksi, tidak ada yang dibayar.', 20),
       ('Bagaimana keuntungannya dihitung?',
        'Setiap produk punya harga modal dan harga jual. Selisihnya menjadi keuntungan BUMDes dan langsung menambah saldo begitu transaksi berhasil. Rinciannya per transaksi bisa dibuka di menu Laporan.', 30),
       ('Bagaimana kalau transaksi gagal?',
        'Saldo yang ditahan saat pembelian dikembalikan otomatis. Setiap perubahan saldo punya catatannya sendiri di menu Histori, sehingga selisih sekecil apa pun bisa ditelusuri.', 40),
       ('Apakah datanya aman?',
        'Setiap pembelian butuh PIN transaksi atau sidik jari, terpisah dari kata sandi masuk. Kata sandi dan PIN disimpan dalam bentuk teracak, dan tidak pernah ikut dalam salinan data yang diunduh admin.', 50),
       ('Bagaimana cara menarik keuntungan ke rekening?',
        'Penarikan dana ke rekening bank masih dalam pengembangan dan belum bisa dipakai. Saat ini keuntungan tersimpan sebagai saldo dan dapat dipakai untuk transaksi berikutnya. Begitu fitur ini siap, pengumumannya akan muncul di dalam aplikasi.', 60)
     ) AS x(tanya, jawab, urut)
WHERE s.key = 'faq'
  AND NOT EXISTS (SELECT 1 FROM landing_items i WHERE i.section_id = s.id);

-- ── Kaki halaman ──────────────────────────────────────────────────────────
INSERT INTO landing_sections (key, kind, title, body, settings, sort_order) VALUES
  ('kaki', 'kaki',
   'Mulai dari satu transaksi hari ini.',
   'Pendaftaran gratis. Saldo pertama boleh sekecil apa pun.',
   jsonb_build_object(
     'catatan_legal', 'Syarat & Ketentuan, Kebijakan Privasi, dan Kebijakan Refund dapat dibaca di dalam aplikasi melalui menu Akun.'
   ),
   110)
ON CONFLICT (key) DO NOTHING;
