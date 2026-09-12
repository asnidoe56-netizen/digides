# PRD Halaman Depan digidespay.pro

**Versi 1.0 — draf** · 12 September 2026 · **Belum dikerjakan**

> **Kenapa ini mendesak.** Alamat `https://digidespay.pro` hari ini masih
> menampilkan halaman contoh bawaan Next.js: *"DigiDes — Fondasi Next.js +
> TypeScript + PostgreSQL sedang berjalan."* Judul situs di metadata juga
> masih kalimat pengembang. Padahal alamat itulah yang diketik calon mitra
> yang mendengar nama Digides dari tetangganya, dan yang muncul kalau ada
> yang mencari "aplikasi PPOB BUMDes" di mesin pencari.

---

## 1. Masalah yang diselesaikan

Digides punya aplikasi yang berjalan, mitra yang bertransaksi, dan dokumen
legal yang lengkap — tapi **tidak punya tempat untuk menjelaskan dirinya
sendiri**. Akibatnya:

1. **Calon mitra tidak punya tempat berlabuh.** Setiap pertanyaan harus
   dijawab satu per satu lewat WhatsApp, termasuk pertanyaan yang sama
   berulang-ulang: apa ini, berapa biayanya, aman tidak, bagaimana daftarnya.
2. **Tidak ada bukti keaslian.** Mitra yang diminta memasang APK di luar
   Play Store wajar curiga. Halaman resmi dengan alamat yang sama adalah cara
   paling murah untuk membuktikan aplikasinya benar milik Digides.
3. **Tidak ditemukan mesin pencari.** Tidak ada satu kalimat pun yang bisa
   diindeks untuk kata yang benar-benar dicari orang desa.
4. **Halaman contoh yang tampil sekarang menurunkan kepercayaan** justru pada
   orang yang paling ingin tahu.

---

## 2. Sasaran

| Pengunjung | Yang ia cari | Yang harus ia dapat |
|---|---|---|
| **Pengurus BUMDes / perangkat desa** | Unit usaha yang tidak macet dan bisa dipertanggungjawabkan | Penjelasan model usahanya, bukti pengelolaannya rapi, cara mulai |
| **Calon agen / pemilik konter** | Tambahan penghasilan dari layanan yang sudah dipakai warga | Daftar layanan, cara kerja komisi, cara daftar |
| **Mitra yang sudah ada** | Unduh APK terbaru, baca panduan | Tautan unduh dan panduan, tanpa harus bertanya |
| **Warga / calon pelanggan** | Memastikan ini bukan penipuan | Identitas badan usaha, kontak resmi, dokumen legal |

**Tujuan terukur** (dipasang sejak hari pertama, bukan ditambahkan nanti):

1. Pengunjung menekan **Daftar Jadi Mitra** → halaman pendaftaran yang sudah ada.
2. Pengunjung menekan **Unduh Aplikasi**.
3. Pengunjung menghubungi admin lewat WhatsApp.

---

## 3. Ciri khas Digides yang harus terasa

Bahan mereknya sudah ada, tinggal dipakai konsisten — halaman ini tidak boleh
memperkenalkan bahasa visual baru.

| Unsur | Ketentuan |
|---|---|
| **Merah** `#DC2626` (dan gradasi `#EF4444 → #B91C1C`) | Warna utama: tombol utama, penanda bagian, aksen. Sama persis dengan aplikasi mitra |
| **Emas** dari logo | Hanya aksen tipis (garis, ikon kecil, sorotan angka). Emas yang berlebihan membuatnya terlihat seperti undangan, bukan alat kerja |
| **Hitam pekat** | Latar bagian pembuka dan penutup, mengikuti layar pembuka aplikasi — sehingga situs dan aplikasi terasa satu keluarga |
| **Putih bersih** | Latar badan halaman. Layanan keuangan harus terlihat terang dan tidak ramai |
| **Logo elang emas** | Di kepala halaman dan penutup. Berkas: `public/logos/digidespay.png` (belum ada di repo web, lihat Bagian 9) |
| **Tipografi** | Judul tebal dan besar, kalimat pendek. Bahasa Indonesia sehari-hari, bukan istilah teknis |
| **Foto** | Konteks desa yang nyata: warung, balai desa, ibu-ibu membayar tagihan. Bukan foto stok gedung perkantoran |

**Nada bicara:** langsung, jujur, tanpa janji berlebihan. "Bayar tagihan
listrik warga dari warung Anda" lebih baik daripada "solusi finansial
terintegrasi berbasis teknologi".

---

## 4. Susunan halaman

Satu halaman panjang, dibaca dari atas ke bawah. Urutannya mengikuti
pertanyaan yang benar-benar muncul di kepala pengunjung.

### 4.1 Pembuka
- Logo, nama, dan satu kalimat yang menjelaskan seluruhnya:
  **"Jadikan BUMDes sumber pendapatan desa."**
- Sub: layanan yang dijual warga setiap hari — pulsa, token listrik, tagihan.
- Dua tombol: **Daftar Jadi Mitra** (utama) dan **Unduh Aplikasi**.
- Gambar: tampilan Beranda aplikasi di HP.

### 4.2 Masalah yang dikenali sendiri oleh pembaca
Diambil dari bahan pemasaran yang sudah ada: modal sudah diberi tapi tidak
berkembang, pengelolaan tidak tertata, unit usaha tidak berjalan, pendapatan
minim, laporan tidak jelas, kepercayaan warga menurun.

Bagian ini pendek. Tujuannya membuat pembaca berkata "ini desa saya", bukan
menggurui.

### 4.3 Layanan yang bisa dijual
Enam kartu, memakai ikon yang sama dengan aplikasi:
Pulsa & Data · Token Listrik · Bayar Tagihan (PLN, PDAM, BPJS, Internet) ·
Isi Saldo E-Wallet · Kasir Toko · Laporan & Komisi.

Setiap kartu satu kalimat. Tidak ada daftar harga di sini — harga berubah,
dan halaman yang memuat harga usang lebih merugikan daripada tidak memuatnya.

### 4.4 Cara kerjanya, tiga langkah
1. **Daftar** dan lengkapi data BUMDes atau konter Anda.
2. **Isi saldo** lewat transfer, saldo masuk otomatis.
3. **Mulai melayani warga** — setiap transaksi tercatat, keuntungan langsung
   masuk saldo.

### 4.5 Kenapa Digides
Empat hal, semuanya bisa dibuktikan:
- **Tercatat rapi.** Setiap transaksi punya riwayat dan laporan yang bisa
  ditunjukkan ke musyawarah desa.
- **Uang aman.** Setiap pembelian dikunci PIN atau sidik jari, dan saldo yang
  gagal kembali otomatis.
- **Cepat.** Token listrik dan pulsa umumnya sampai dalam hitungan detik.
- **Tidak ditinggal sendiri.** Ada panduan pengguna di dalam aplikasi dan
  admin yang bisa dihubungi.

### 4.6 Untuk siapa
Tiga kolom: BUMDes, konter/agen, dan pengurus yang ingin unit usaha barunya
berjalan tanpa menambah pegawai.

### 4.7 Pertanyaan yang sering ditanyakan
Berapa modal awalnya · Apakah ada biaya bulanan · Bagaimana keuntungannya
dihitung · Bagaimana kalau transaksi gagal · Apakah datanya aman ·
Bagaimana cara menarik keuntungan.

Jawabannya harus benar menurut keadaan sistem hari ini. Kalau satu fitur
belum ada — misalnya penarikan dana — jawabannya menyebutkan itu apa adanya,
bukan menjanjikan yang belum jadi.

### 4.8 Penutup dan kaki halaman
- Ajakan terakhir dengan tombol yang sama.
- Identitas badan usaha, alamat, kontak resmi, dan tautan **Syarat &
  Ketentuan**, **Kebijakan Privasi**, **Kebijakan Refund** — ketiganya sudah
  ada isinya di aplikasi dan tinggal ditayangkan.
- `© 2026 DIGIDESPAY. All rights reserved.`

---

## 5. Aturan isi yang tidak boleh dilanggar

1. **Tidak mengarang angka.** Tidak ada "10.000 mitra" atau "1 juta
   transaksi" sebelum angkanya benar-benar ada. Kalau ingin menyebut
   kecepatan, yang boleh dipakai adalah yang sudah terukur nyata dan tercatat
   di dokumen arsitektur (2–7 detik ujung-ke-ujung untuk token dan pulsa).
2. **Tidak ada testimoni buatan.** Kosongkan bagiannya sampai ada mitra
   sungguhan yang bersedia. Testimoni palsu adalah kebohongan yang paling
   mudah ketahuan di desa, tempat semua orang saling kenal.
3. **Tidak menjanjikan fitur yang belum ada.** Tarik Dana masih berlabel
   "Mendatang" di aplikasi; halaman ini tidak boleh menyebutnya seolah sudah
   jalan.
4. **Tidak ada tangkapan layar berisi data mitra sungguhan.** Nomor, nama,
   dan saldo pada gambar harus contoh.

---

## 6. Ketentuan teknis

| Hal | Ketentuan | Alasan |
|---|---|---|
| Letak | `src/app/page.tsx` menggantikan halaman contoh | Alamat utama yang sudah diketik orang |
| Rendering | Statis (`force-static`), tanpa data dari database | Halaman depan tidak boleh ikut mati kalau database sibuk |
| Berat halaman | Target di bawah 500 KB, gambar `next/image` | Dibuka dari HP dengan sinyal desa |
| Kecepatan | LCP di bawah 2,5 detik pada jaringan 4G lambat | Pengunjung yang menunggu akan pergi |
| Font | Font sistem atau satu keluarga yang sudah dipakai | Menambah font berarti menambah waktu tunggu |
| SEO | `title`, `description`, Open Graph, `lang="id-ID"`, sitemap, robots | Metadata sekarang masih teks pengembang |
| Tanpa pelacak pihak ketiga pada rilis pertama | — | Halaman ini membaca publik; pelacak menambah beban dan pertanyaan privasi |
| Responsif | Dirancang dari lebar 360px ke atas | Hampir semua pengunjung memakai HP |
| Aksesibilitas | Kontras minimal AA, teks minimal 16px, tombol setinggi 48px | Banyak pengurus desa berusia di atas 50 tahun |

---

## 7. Kriteria penerimaan

- [x] Halaman contoh bawaan Next.js tidak ada lagi di alamat utama.
- [x] Judul dan deskripsi situs menjelaskan Digides, bukan kerangka kerjanya.
- [x] Tombol Daftar mengarah ke halaman pendaftaran yang sudah ada dan benar-benar bisa diselesaikan.
- [x] Tautan unduh APK menunjuk berkas yang benar dan versinya disebutkan. Berkas
      yang terunduh terbukti identik dengan APK yang dibangun Flutter (sha256 sama).
- [ ] Ketiga dokumen legal bisa dibuka dari kaki halaman. **Belum** — isinya masih
      hanya ada di dalam aplikasi, dan kaki halaman menyebut itu apa adanya
      daripada memasang tautan yang mati (Tahap 4).
- [x] Tidak ada satu pun angka, testimoni, atau fitur yang tidak bisa dibuktikan hari ini.
- [x] Terbaca rapi pada lebar 360px tanpa menggeser layar ke samping (diperiksa
      pada 390px dan 1280px: tidak ada geser samping).
- [ ] Lolos pemeriksaan kecepatan pada jaringan lambat (target Bagian 6). Belum
      diukur di jaringan sungguhan; HTML halaman 14,5 KB terkompresi, tanpa foto.
- [x] Warna, logo, dan nada bicaranya sama dengan aplikasi mitra.

---

## 8. Urutan pengerjaan

1. **Tahap 1 — kerangka dan isi. SELESAI.** Susunan Bagian 4 dengan teks final,
   memakai warna dan logo yang ada. Tanpa foto dulu. Ditambah satu bagian yang
   tidak ada di rencana awal: petunjuk memasang APK, karena berkasnya dibagikan
   di luar Play Store (lihat Bagian 9 nomor 4).
2. **Tahap 2 — metadata dan penemuan. SELESAI.** Judul, deskripsi, Open Graph,
   sitemap, robots.
3. **Tahap 3 — gambar.** Foto konteks desa, menunggu berkas dari pemilik produk.
   Tampilan aplikasi di bagian pembuka sudah ada, digambar dengan CSS dan
   bertuliskan "contoh tampilan" — bukan tangkapan layar mitra sungguhan
   (aturan Bagian 5 nomor 4).
4. **Tahap 4 — halaman legal publik.** Menayangkan tiga dokumen yang sudah
   ada di aplikasi.
5. **Tahap 5 — pengukuran.** Menghitung penekanan tombol utama, supaya
   perubahan berikutnya berdasar angka, bukan selera.

---

## 9. Yang dibutuhkan dari pemilik produk

1. ~~**Berkas logo untuk web**~~ — **selesai.** Logo aplikasi disalin ke
   `public/logos/digidespay.jpg`. Berkasnya persegi dan memuat lambang beserta
   tulisan; di halaman web yang ditampilkan hanya lambangnya, dan nama mereknya
   ditulis sebagai teks supaya tetap terbaca pada ukuran kecil.
2. **Identitas badan usaha** untuk kaki halaman: nama resmi, alamat, dan
   kontak yang boleh ditampilkan publik.
3. **Nomor WhatsApp resmi** yang dipakai tombol hubungi admin.
4. ~~**Keputusan cara unduh APK**~~ — **sudah diputuskan:** berkas langsung dari
   situs. Super Admin mengunggahnya di menu **Aplikasi Mitra**, dan tombol di
   halaman depan menyajikan rilis yang sedang ditandai tayang. Petunjuk
   pemasangannya ikut ditulis di halaman depan.
5. **Foto** yang boleh dipakai. Kalau belum ada, Tahap 3 ditunda dan halaman
   tetap tayang tanpa foto — lebih baik polos daripada memakai foto stok yang
   jelas bukan desa Indonesia.
6. **Jawaban FAQ** soal biaya dan penarikan keuntungan, karena itu menyangkut
   kebijakan usaha, bukan kode.

---

## 10. Risiko

| Risiko | Dampak | Penanganan |
|---|---|---|
| Halaman menjanjikan lebih dari yang ada | Mitra kecewa di hari pertama, kepercayaan hilang di desa | Aturan Bagian 5, diperiksa sebelum tayang |
| Foto stok yang tidak sesuai konteks desa | Terasa palsu, justru menurunkan kepercayaan | Lebih baik tanpa foto |
| Halaman berat | Ditinggal sebelum terbuka | Batas berat dan kecepatan di Bagian 6 |
| Harga atau daftar layanan usang | Pengunjung merasa dibohongi | Halaman tidak memuat harga; layanan disebut umum |
| Unduh APK di luar Play Store | Android memperingatkan, sebagian mitra takut | Halaman petunjuk pemasangan yang jujur menjelaskan peringatannya |

---

## 11. Penyaluran APK (dibangun bersama halaman ini)

Tombol **Unduh Aplikasi** tidak menunjuk berkas statis. Ia menunjuk satu
alamat yang selalu menyajikan rilis yang sedang ditandai tayang, sehingga
tautan yang sudah tersebar di grup WhatsApp desa tetap benar setelah versi
baru naik — dan berhenti memberikan versi lama begitu versi itu ditarik.

### 11.1 Tempat berkasnya

APK disimpan **di luar basis data dan di luar folder aplikasi**, pada
folder yang ditunjuk `APK_STORAGE_DIR` (di server: `/home/digides/storage/apk`).

- Bukan di dalam basis data: berkas 30 MB akan ikut masuk ke setiap `pg_dump`
  harian dan membuat cadangan yang sebelumnya beberapa megabita menjadi
  ratusan, demi berkas yang tidak punya hubungan dengan data keuangan.
- Bukan di dalam folder aplikasi: `git pull` dan `npm run build` menyentuh
  seluruh isi folder itu, dan berkas yang tidak ada di git akan hilang di
  salah satu penerapan.
- Bukan di `public/`: Next.js menyalin `public/` ke dalam hasil build, jadi
  berkas yang diunggah **setelah** build tidak akan pernah ikut tersalin.

Nama berkas di disk disusun server dari nomor versi dan sidik jari isinya —
tidak pernah diambil dari nama berkas yang dikirim peramban.

### 11.2 Tabel `app_releases` (migrasi 059)

Menyimpan catatan rilis, bukan berkasnya: versi, nomor build, nama berkas,
ukuran, sha256, catatan perubahan, penandaan tayang, dan pengunggahnya.
Dua penjagaan ada di basis data, bukan hanya di kode:

- Indeks unik parsial `app_releases_hanya_satu_aktif` — mustahil ada dua
  rilis tayang sekaligus, karena dua rilis tayang berarti dua jawaban untuk
  pertanyaan "APK mana yang diunduh orang".
- Indeks unik `app_releases_versi_unik` — satu kombinasi versi hanya sekali.

Rilis lama **tidak** dihapus otomatis. Kalau versi baru ternyata rusak,
menayangkan kembali yang lama harus cukup satu klik. Rilis yang sedang
tayang tidak bisa dihapus sama sekali.

### 11.3 Yang diperiksa saat mengunggah

Hanya Super Admin. Berkasnya harus berakhiran `.apk` **dan** empat byte
pertamanya harus penanda arsip ZIP (`PK\x03\x04`) — akhiran saja datang dari
klien dan bisa ditulis apa saja. Ukuran dibatasi 100 MB (APK saat ini 28–31
MB). Unggahan yang isinya sama persis dengan rilis yang sudah ada ditolak
**sebelum** berkasnya menyentuh disk, karena nama berkas disusun dari versi
dan sidik jari isinya: kalau penolakannya baru terjadi di basis data,
pembersihan setelah gagal akan menghapus berkas milik rilis yang sudah ada.

Setiap unggahan, penayangan, dan penghapusan tercatat di **Audit Log**.

### 11.4 Dua batas ukuran yang harus dinaikkan

Keduanya di luar kode aplikasi, dan keduanya menolak unggahan 28 MB dengan
diam-diam kalau dibiarkan bawaannya:

| Lapis | Bawaan | Disetel ke |
|---|---|---|
| Next.js (`experimental.proxyClientMaxBodySize`) | 10 MB | `110mb`, di `next.config.ts` |
| Nginx (`client_max_body_size`) | 1 MB | `110m`, **hanya** pada alamat unggahan APK |

Nginx sengaja tidak dilonggarkan untuk seluruh situs: batas yang longgar di
mana-mana berarti siapa pun yang bisa mencapai server bisa membuatnya menahan
ratusan megabita. Yang dilonggarkan hanya satu alamat, dan alamat itu menolak
siapa pun yang bukan Super Admin.
