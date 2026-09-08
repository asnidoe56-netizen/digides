# PRD Digides Toko

> **Versi 2.3 · 8 September 2026 · Tahap 1 & 2 selesai, Tahap 3 siap dimulai**
> Menggantikan PRD v1.0/v2.1/v2.2. Versi berformat (belum disinkronkan ke v2.3): https://claude.ai/code/artifact/024b6af2-f941-4ca5-958a-ab67a536ffea

Saluran distribusi saldo untuk bisnis PPOB Digides — warung mendapat modal jualan pulsa dari hasil belanja pelanggannya, tanpa perlu ke bank.

**Status pengerjaan**: Tahap 1 dan Tahap 2 (§9) sudah dikerjakan dan diverifikasi — lihat §7a (Tahap 1) dan §9a (Tahap 2) untuk rinciannya. Migrasi `044_stores.sql` dan `045_store_wallet.sql` sudah diterapkan; migrasi Toko berikutnya (mesin pembayaran, Tahap 3) dimulai dari `046`.

---

## 0. Ringkasan

**Digides Toko bukan fitur commerce.** Ia adalah cara kedua untuk mendapatkan saldo Digides — selain top up lewat bank. Warung yang menerima pembayaran dari pelanggannya otomatis terisi saldonya, dan saldo itu dipakai untuk berjualan pulsa dan token. Membaca fitur ini sebagai "aplikasi kasir" akan menghasilkan produk yang salah sasaran.

Fondasi finansialnya — ledger append-only, penguncian saldo, konfirmasi PIN/biometrik oleh pemilik dana sendiri, mesin status transaksi — **sudah ada dan sudah teruji produksi**. Yang benar-benar baru hanya tiga: entitas toko, dompet bertipe toko, dan siklus hidup permintaan pembayaran.

Risiko terbesar proyek ini bukan UI kasir, melainkan **perutean "dompet yang mana"** pada kode finansial yang sudah memegang uang nyata (§7).

---

## 1. Model & lingkaran saldonya

Hari ini, untuk berjualan pulsa di Digides seseorang harus top up lewat bank lebih dulu. Toko menghapus keharusan itu:

```
Warga belanja di warung  → bayar pakai saldo Digides → saldo warung bertambah
Warga beli pulsa di warung → bayar tunai              → saldo warung terpakai, uang tunai masuk
```

Warung mengisi ulang modal jualan pulsanya dari hasil jualan sembako — tanpa ke bank, tanpa ke ATM. Kalimat jualannya sesederhana itu: **"Jualan sembako Anda otomatis jadi modal jualan pulsa."**

### Target merchant: warung yang juga jualan pulsa

Model ini hanya masuk akal bagi merchant yang mau berjualan pulsa. Warung yang tidak berminat akan merasa menukar mie dan kopi nyata dengan saldo yang tidak bisa ia pakai, lalu berhenti menerimanya dalam hitungan hari. Segmennya karena itu sempit tapi padat — dan di Indonesia, warung yang sekaligus jualan pulsa sangat umum, sehingga justru lebih mudah dibidik daripada "semua UMKM".

### Bagaimana kalau merchant butuh uang tunai?

Tidak perlu fitur pencairan sama sekali. Katalog Digides sudah menjual produk E-Money (DANA, ShopeePay, OVO, GoPay), jadi merchant tinggal membelinya ke nomornya sendiri — sama seperti membeli produk digital lain.

Biayanya nyata dan murah (modal dari Digiflazz, per 8 September 2026):

| Produk | Modal | Biaya efektif |
|---|---|---|
| DANA 10.000 | Rp10.150 | Rp150 (1,5%) |
| DANA 50.000 | Rp50.150 | Rp150 (0,3%) |
| DANA 100.000 | Rp100.150 | Rp150 (0,15%) |
| ShopeePay 50.000 | Rp51.025 | Rp1.025 (2%) |
| OVO 50.000 | Rp51.425 | Rp1.425 (2,9%) |
| GoPay 50.000 | Rp51.825 | Rp1.825 (3,7%) |

DANA memungut Rp150 tetap berapa pun nominalnya — lebih murah daripada biaya transfer antarbank. Konsekuensinya justru menguntungkan: setiap merchant yang mengonversi saldonya **membeli produk PPOB**, sehingga Digides mendapat margin seperti penjualan biasa. Pencairan berubah dari pusat biaya menjadi sumber pendapatan, dan perpindahan uang sesungguhnya tetap dikerjakan Digiflazz — bukan Digides.

### ⚠️ Satu catatan yang perlu dijaga: ini kemampuan, bukan fitur bernama "Pencairan"

Secara komponen semuanya wajar: merchant membeli produk digital, dan E-Money kebetulan salah satu kategorinya. Tetapi bila dipromosikan sebagai *"Cairkan saldo toko Anda ke DANA"*, rangkaian terima-tahan-salurkan itu terbaca sebagai satu alur pencairan utuh, dan penilaian regulasi umumnya melihat substansi, bukan bentuk. Perbedaannya gratis dan ada di tangan pemilik produk: **jangan buat menu bernama "Pencairan"** — saldo toko dibelanjakan di katalog seperti biasa. Kemampuannya sama, posisinya berbeda.

### Keputusan yang sudah diambil

| Pertanyaan | Keputusan |
|---|---|
| Pencairan dana ke bank | **Tidak dibangun.** Konversi lewat pembelian produk E-Money yang sudah ada. |
| Saldo toko boleh dipakai untuk apa | **Hanya belanja di dalam Digides.** Tidak bisa ditransfer keluar sebagai uang. |
| QRIS atau QR internal | **QR internal.** Tujuannya memutar saldo di komunitas Digides, bukan jadi jaringan pembayaran umum. |
| Target merchant | **Warung yang menjual (atau mau menjual) pulsa.** |

---

## 2. Fondasi yang sudah ada

Inventaris ini sengaja dibuat agar tidak ada yang membangun ulang sesuatu yang sudah berjalan. Semua baris **SUDAH ADA** sudah dipakai transaksi nyata di produksi.

| Kebutuhan Digides Toko | Sudah tersedia sebagai | Status |
|---|---|---|
| Dompet toko terpisah dari dompet pribadi | `wallet_accounts` memakai pola *exclusive arc* (`USER`/`BUMDES`/`KONTER` + FK pemilik yang saling meniadakan). Menambah tipe `STORE` adalah perluasan pola, bukan perombakan. | SUDAH ADA |
| Catatan finansial yang bisa diaudit | `wallet_ledger` — append-only (trigger menolak UPDATE/DELETE), menyimpan `balance_before` dan `balance_after` per baris. | SUDAH ADA |
| Debit pembeli + kredit merchant secara atomik | `transferToDownline` — dua kaki `TRANSFER_OUT`/`TRANSFER_IN` di dalam satu transaksi basis data. | SUDAH ADA |
| Pembeli mengonfirmasi sendiri, kasir tak pernah pegang PIN | Layar PIN + biometrik (`verifyTransactionPin`, biometrik perangkat) yang sudah dipakai setiap pembelian PPOB. | SUDAH ADA |
| Anti transaksi ganda | `idempotency_key` + transisi status *compare-and-swap* pada mesin transaksi PPOB. | SUDAH ADA |
| Penguncian saldo saat perubahan | `withTransaction()` + row locking + kolom `wallets.version`. | SUDAH ADA |
| Jejak audit & notifikasi | `audit_logs`, `transaction_events`, sistem notifikasi in-app. | SUDAH ADA |
| Pemindai QR di aplikasi mitra | Pemindai kamera yang dipasang untuk nomor meter PLN — tinggal dipakai ulang. | SUDAH ADA |
| Cara merchant mengonversi saldo jadi uang | Kategori E-Money di katalog (DANA, ShopeePay, OVO, GoPay). Verifikasi nama penerima juga sudah ada. | SUDAH ADA |
| Entitas toko, katalog produk toko, stok | Belum ada. Tabel `products` yang ada hari ini milik katalog Digiflazz — domain berbeda, jangan dipakai ulang. | BARU |
| Permintaan pembayaran dengan masa berlaku | Belum ada. Butuh mesin status tersendiri (§5). | BARU |
| Kunci: saldo toko hanya untuk belanja di Digides | Belum ada — dompet toko harus dilarang menjadi sumber transfer keluar (§4, migrasi 044). | BARU |

---

## 3. Ruang lingkup MVP

Tujuan MVP bukan menjadi aplikasi kasir lengkap, melainkan membuktikan satu hal: **warung penjual pulsa mau menerima saldo Digides sebagai pembayaran, dan memakainya sebagai modal jualan.** Semua yang tidak menguji hipotesis itu ditunda.

**Masuk MVP**

- Buka toko + profil toko + status verifikasi
- Produk sederhana (nama, harga jual, stok, aktif/nonaktif)
- Kasir: cari produk, keranjang, total
- QR dinamis per transaksi, berlaku 5 menit
- Pembayaran dari saldo Digides pembeli
- Dompet toko yang bisa langsung dipakai membeli produk PPOB
- Riwayat transaksi toko
- Struk digital (memakai generator PDF yang sudah ada di Histori)

**Sengaja di luar MVP**

- Fitur pencairan dana — tidak dibangun sama sekali (§1)
- QRIS — QR internal saja
- QR statis — rawan stiker ditukar & salah ketik nominal
- Karyawan/kasir tambahan & peran akses
- Refund (skemanya disiapkan, alurnya belum)
- Diskon, voucher, promo, shift kasir
- Laporan laba-rugi, supplier, marketplace
- Reservasi stok (risiko oversell diterima, lihat §11)

---

## 4. Perubahan skema

Melanjutkan penomoran migrasi yang ada (terakhir `042_transactions_customer_name.sql`), mengikuti konvensi yang sudah dipakai: constraint eksplisit, trigger `updated_at`, dan tabel finansial yang tidak bisa diubah setelah ditulis.

| Migrasi | Isi | Catatan penting |
|---|---|---|
| `043_wallet_transfers` | ✅ **Sudah diterapkan** — `wallet_transfers`, kolom `wallet_ledger.transfer_id` | Bagian dari Tahap 1 (§7a), bukan Toko itu sendiri — memperbaiki bug transfer yang belum idempotent, konsumsi nomor migrasi ini lebih dulu. |
| `044_stores` | ✅ **Sudah diterapkan** — `stores` | Pemilik = `users.id`, `UNIQUE` (satu toko per pemilik, lihat §9a). Status: `DRAFT → SUBMITTED → ACTIVE → SUSPENDED/CLOSED`. Alamat memakai tabel `wilayah` yang sudah ada (migrasi 039). `store_settings` sengaja **tidak** dibuat — lihat §9a untuk alasannya. |
| `045_store_wallet` | ✅ **Sudah diterapkan** — Tambah `'STORE'` ke `account_type`, kolom `store_id`, perluas constraint arc, indeks unik per toko | Satu toko = satu dompet. Pemilik tetap punya dompet `USER`-nya sendiri, terpisah penuh. **Dompet `STORE` tidak boleh menjadi sumber `TRANSFER_OUT`** — hanya boleh membelanjakan saldonya di katalog Digides. Ditegakkan di layanan transfer, bukan sekadar disembunyikan di UI (lihat §9a). |
| `046_store_products` | `store_products`, `store_inventory_events` | Terpisah total dari `products` (katalog Digiflazz). Pergerakan stok dicatat sebagai event, bukan hanya angka yang ditimpa. |
| `047_store_orders` | `store_orders`, `store_order_items`, `store_payment_requests` | `store_payment_requests` menyimpan `idempotency_key`, nominal terkunci, `expires_at`, dan status (§5). |
| `048_ledger_types` | Tambah `SALE_IN` / `SALE_OUT` ke `wallet_ledger.type` | Jangan pakai ulang `TRANSFER_IN/OUT`: laporan harus bisa membedakan "kiriman saldo" dari "penjualan toko". |

---

## 5. Alur pembayaran

Alur ini **tidak boleh** dititipkan ke mesin transaksi PPOB yang terkunci (lihat `docs/architecture/FLOW_KERJA_DAN_BATASAN_KERJA_TRANSAKSI.md`). Pembayaran merchant justru lebih sederhana — murni perpindahan saldo internal, tanpa provider luar — tapi wajib meminjam polanya: idempotency, transisi *compare-and-swap*, satu corong hasil, dan event audit.

```
DIBUAT → MENUNGGU → BERHASIL
                  ↘ GAGAL / KEDALUWARSA / DIBATALKAN
```

Hanya `MENUNGGU` yang bisa berpindah ke status akhir, dan hanya sekali — dijaga oleh transisi *compare-and-swap* yang sama seperti mesin transaksi PPOB. Status akhir bersifat final; pembalikan hanya lewat refund (fase berikutnya), tidak pernah dengan mengubah status.

### Urutan kejadian

1. Kasir menyusun keranjang → server membuat `store_orders` beserta itemnya, dengan harga *disalin saat itu juga* (harga produk boleh berubah nanti tanpa mengubah pesanan lama).
2. Server membuat `store_payment_requests`: nominal terkunci, `expires_at` = 5 menit, `idempotency_key` dari server.
3. Aplikasi kasir menampilkan QR berisi identifier permintaan itu — **bukan** nominal mentah, agar tidak bisa diubah di sisi klien.
4. Pembeli memindai, aplikasinya mengambil rincian dari server, lalu menampilkan nama toko, daftar item, dan total.
5. Pembeli mengonfirmasi dengan PIN/biometriknya sendiri, di perangkatnya sendiri.
6. Server memvalidasi ulang *semuanya* (kepemilikan, status, masa berlaku, saldo), lalu dalam satu transaksi basis data: debit dompet pembeli, kredit dompet toko, kurangi stok, tandai pesanan berhasil, catat event.
7. Kedua sisi menerima struk yang sama.

---

## 6. Aturan finansial yang tidak boleh dilanggar

Ditulis dengan gaya yang sama seperti dokumen alur transaksi yang sudah dikunci, agar bisa diperlakukan setara oleh siapa pun yang mengerjakan nanti.

1. Nominal pembayaran **hanya** berasal dari `store_payment_requests` di server. Nominal yang dikirim klien tidak pernah dipercaya.
2. PIN dan biometrik pembeli tidak pernah melewati perangkat, aplikasi, atau sesi milik merchant.
3. Debit pembeli, kredit toko, pengurangan stok, dan perubahan status pesanan terjadi dalam **satu** transaksi basis data. Tidak ada keadaan setengah jadi.
4. Setiap permintaan pembayaran punya `idempotency_key`; percobaan ulang mengembalikan hasil yang sama, tidak pernah membuat pembayaran kedua.
5. Permintaan yang lewat `expires_at` tidak bisa dibayar, bahkan bila QR-nya masih terpampang di layar kasir.
6. Pembayaran gagal tidak mengubah saldo mana pun dan tidak mengurangi stok.
7. Saldo tidak pernah diperbaiki lewat UPDATE langsung. Koreksi apa pun adalah baris ledger baru dengan alasan tercatat.
8. Kasir tidak pernah bisa menyentuh dompet pribadi pemilik toko — hanya dompet bertipe `STORE` milik toko itu.
9. Dompet `STORE` hanya boleh membelanjakan saldonya di katalog Digides. Ia tidak pernah bisa menjadi sumber transfer saldo ke pengguna lain — kalau tidak, jalur pencairan informal terbuka lewat pintu belakang.

---

## 7. Sentuhan pada kode yang sudah jalan

Bagian tersulit proyek ini bukan fitur barunya, melainkan tiga tempat di kode yang sudah memegang uang nyata.

### Perutean dompet — risiko tertinggi

Seluruh kode finansial hari ini memanggil `getWalletForMitraSession(userId, roles)`, yang mengasumsikan **satu dompet per pengguna**. Begitu seorang pengguna bisa punya dompet pribadi *dan* dompet toko, setiap titik panggilan finansial harus memilih dompet secara eksplisit. Ini menyentuh pembelian PPOB, transfer, top up, dan laporan yang semuanya sudah berjalan. Perlu dikerjakan lebih dulu, sendirian, dengan verifikasi jejak transaksi nyata — bukan disisipkan di tengah pekerjaan fitur toko.

### Transfer yang ada belum idempotent

~~Referensi transfer hari ini dibentuk dari `transfer-{pengirim}-{penerima}-{waktu}`...~~ **Sudah diperbaiki — lihat §7a.**

### Katalog produk jangan dipakai ulang

Tabel `products` disinkronkan dari Digiflazz dan bisa ditimpa kapan saja oleh sinkronisasi katalog. Produk warung harus hidup di tabelnya sendiri.

---

## 7a. Tahap 1 — hasil pengerjaan (8 September 2026)

Diaudit 44 titik panggilan resolusi dompet di seluruh `src/` (web) plus penggunaan `currentWallet` di Flutter. Temuan: desain skema yang direncanakan di §4 (kolom `store_id` terpisah dari `user_id`) **sudah aman secara struktur** — 43 dari 44 titik panggilan tetap benar tanpa perubahan sama sekali begitu dompet `STORE` ada nanti, karena semuanya memang bermaksud "dompet operasi milik sesi ini sendiri", bukan "dompet apa pun yang mungkin dimiliki identitas ini". Jadi pekerjaan Tahap 1 bukan menulis ulang 44 titik itu (yang hanya akan jadi churn tanpa manfaat), melainkan:

1. **Mengunci kontrak lewat dokumentasi kode** — `getWalletForMitraSession`, `getOwningUserId`, dan `findWalletByOwner` (semua di `wallet.service.ts`/`wallet.repository.ts`) sekarang punya komentar eksplisit: fungsi-fungsi ini tidak boleh diperluas untuk ikut meresolusi dompet `STORE`; resolusi dompet toko wajib lewat fungsi terpisah (mis. `getWalletForStore(storeId)`) yang akan dibuat di Tahap 2/3.
2. **Memperbaiki satu fungsi yang benar-benar rapuh** — `getWalletByOwningUserId` memakai `WHERE user_id=$1 OR admin_user_id=$1 OR operator_user_id=$1 LIMIT 1` tanpa jaminan urutan, dipakai untuk pembayaran komisi. Diganti: `payCommissionToBeneficiary` sekarang memanggil `getWalletForMitraSession` yang sama seperti titik lain (deterministik berdasar prioritas peran), fungsi lama dihapus karena jadi tidak terpakai.
3. **Memperbaiki bug transfer yang belum idempotent** (temuan awal §7) — migrasi `043_wallet_transfers.sql` menambah tabel `wallet_transfers` dengan `idempotency_key UNIQUE`, persis pola yang sudah dipakai `transactions`. `transferToDownline` sekarang menerima `idempotencyKey` dari klien (web & Flutter, keduanya sudah diperbarui) dan mengklaim baris transfer lebih dulu sebelum memposting ledger — percobaan ulang dengan kunci yang sama mengembalikan hasil yang sama persis, tidak pernah membuat transfer kedua. **Diverifikasi nyata**: 3x pengiriman permintaan identik ke `/api/wallet/transfer` di database dev menghasilkan tepat satu baris `wallet_transfers` dan tepat sepasang baris ledger.

### ⚠️ Temuan penting yang BELUM diperbaiki — perlu instruksi eksplisit

Saat memperbaiki idempotensi transfer, ditemukan bug yang sama bentuknya kemungkinan besar juga ada di **mesin transaksi PPOB yang terkunci** (`transaction.service.ts`'s `createTransaction`, `docs/architecture/FLOW_KERJA_DAN_BATASAN_KERJA_TRANSAKSI.md`): pola "coba INSERT, tangkap error unique-violation, lalu SELECT baris yang sudah ada" akan gagal dengan error Postgres *"current transaction is aborted"* jika dipanggil di dalam transaksi database yang sedang berjalan (yang memang selalu jadi kondisinya di `executeTransaction`) — sama seperti bug yang barusan ditemukan di `createWalletTransfer` sebelum diperbaiki jadi `ON CONFLICT DO NOTHING`.

Praktis, ini berarti: **kalau seorang mitra pernah mengirim ulang permintaan pembelian yang sama** (PIN benar tapi jaringan sempat putus lalu klien kirim ulang dengan `idempotencyKey` yang sama), permintaan kedua kemungkinan akan gagal dengan pesan error yang membingungkan alih-alih mengembalikan hasil transaksi yang sudah ada — bukan salah kirim uang, tapi pengalaman yang buruk dan berpotensi bikin mitra mengira transaksinya gagal padahal sudah berhasil.

Ini **tidak disentuh** karena file itu terkunci dan aturan proyek mewajibkan instruksi eksplisit dan sadar dari pemilik produk sebelum menyentuhnya — sesuai yang diterapkan konsisten sepanjang proyek ini. Perbaikannya sendiri sederhana (pola `ON CONFLICT DO NOTHING` yang sama), tapi perlu persetujuan eksplisit dulu.

## 8. Kriteria penerimaan

Setiap butir harus bisa dibuktikan dengan menelusuri basis data produksi, bukan dengan melihat layar.

- [ ] Pengguna tanpa toko bisa menyelesaikan pendaftaran toko sampai status `ACTIVE`.
- [ ] Pembayaran berhasil menghasilkan **tepat dua** baris ledger: satu debit dompet pembeli, satu kredit dompet toko, dengan referensi yang sama.
- [ ] Total di baris ledger sama persis dengan total pesanan; tidak ada pembulatan yang menyimpang.
- [ ] Pembayaran gagal atau kedaluwarsa tidak meninggalkan satu pun baris ledger dan tidak mengubah stok.
- [ ] Mengirim permintaan bayar yang sama dua kali (ketukan ganda / sinyal putus lalu ulang) hanya menghasilkan satu pembayaran.
- [ ] QR yang sudah lewat 5 menit ditolak server, meski masih tampil di layar kasir.
- [ ] Mengubah nominal di sisi klien tidak mengubah jumlah yang benar-benar didebit.
- [ ] Saldo pribadi pemilik toko tidak pernah berubah akibat penjualan tokonya.
- [ ] Dompet toko tidak bisa dipakai mentransfer saldo ke pengguna lain.
- [ ] Setiap pembayaran bisa ditelusuri ujung ke ujung dari satu transaction ID: pesanan, item, ledger, stok, struk.

---

## 9. Urutan pengerjaan

Diurutkan berdasarkan risiko, bukan berdasarkan apa yang paling cepat terlihat hasilnya. UI kasir dikerjakan terakhir justru karena ia bagian paling mudah diubah.

**Tahap 1 — Perutean dompet eksplisit di seluruh kode finansial yang ada.**
Selesai bila: pembelian PPOB, transfer, dan top up tetap berjalan benar setelah satu pengguna bisa memiliki lebih dari satu dompet — dibuktikan dengan transaksi nyata di produksi.

**Tahap 2 — Entitas toko, dompet toko, dan pendaftaran toko.**
Selesai bila: sebuah toko bisa dibuat, diverifikasi, dan punya dompet bersaldo Rp0 yang terpisah dari dompet pribadi pemiliknya.

**Tahap 3 — Mesin pembayaran: pesanan, permintaan bayar, QR, konfirmasi pembeli, ledger, stok.**
Selesai bila: seluruh kriteria §8 lolos, diuji lewat API tanpa UI kasir sama sekali.

**Tahap 4 — Antarmuka: dasbor toko, katalog produk, kasir, struk.**
Selesai bila: satu transaksi warung nyata selesai dari pilih produk sampai struk, di bawah 30 detik.

---

## 9a. Tahap 2 — hasil pengerjaan (8 September 2026)

Migrasi `044_stores.sql` (tabel `stores`) dan `045_store_wallet.sql` (tipe `'STORE'` pada `wallet_accounts`) sudah diterapkan di database dev, mengikuti persis pola *exclusive arc* yang sudah ada untuk `BUMDES`/`KONTER`/`USER` (migrasi 006): kolom `store_id` baru, `CHECK` tipe akun diperluas, `CHECK` *exclusive arc* diperluas dengan cabang `STORE`, dan indeks unik parsial `wallet_accounts_store_unique_idx` — satu toko tidak akan pernah punya dua dompet.

**Yang dibangun:**

1. **Entitas toko** (`src/repositories/store.repository.ts`, `src/services/store.service.ts`) — `registerStore` membuat baris `stores` (langsung berstatus `SUBMITTED`, karena belum ada UI simpan-draf di Tahap 4) dan dompet `STORE`-nya sekaligus dalam satu transaksi database (`provisionWalletForAccount`, primitif yang sama dipakai `registerMitra` untuk BUMDes) — kegagalan sebagian tidak akan pernah meninggalkan toko tanpa dompet. `verifyStore` memindahkan status `SUBMITTED → ACTIVE` memakai UPDATE ber-*compare-and-swap* (`WHERE status = 'SUBMITTED'`), disiplin yang sama seperti transisi status di mesin transaksi PPOB — percobaan verifikasi ganda pada toko yang sudah `ACTIVE` gagal dengan bersih, bukan diam-diam menjadi no-op.
2. **Resolusi dompet toko** — `getWalletForStore(storeId)` (`wallet.service.ts`) adalah satu-satunya cara resmi meresolusi dompet sebuah toko, persis seperti yang dijanjikan komentar kontrak §7 yang ditulis di Tahap 1. `getWalletForMitraSession` (dompet pribadi/operasional) sama sekali tidak disentuh — pemilik toko tetap punya dua dompet yang sepenuhnya terpisah.
3. **Endpoint API** — `POST /api/stores` (registrasi mandiri, pemilik selalu diri sendiri dari sesi, tidak pernah dari body request), `GET /api/stores/me` (baca status toko + saldo dompetnya sendiri), `POST /api/stores/[id]/verify` (Super Admin saja, lewat `requireRole`).
4. **`store_settings` sengaja tidak dibuat** — tidak ada satu pun kriteria penerimaan Tahap 2/3 yang butuh setting apa pun hari ini; tabel dengan kolom kosong hanya akan jadi skema spekulatif. Ditambahkan nanti di migrasi manapun yang pertama kali benar-benar butuh satu setting nyata.
5. **Satu toko per pemilik** (`stores.owner_user_id UNIQUE`) — simplifikasi MVP yang disengaja, bukan aturan bisnis permanen: target merchant (§1) adalah satu pemilik warung menjalankan satu toko, dan mengunci 1:1 menghindari ambiguitas "toko yang mana" di setiap titik panggilan mendatang sebelum ada kebutuhan nyata untuk lebih dari satu.

**Diverifikasi nyata** lewat panggilan HTTP langsung ke server dev (bukan hanya membaca kode): pengguna baru mendaftar → `POST /api/stores` menghasilkan toko berstatus `SUBMITTED` dengan dompet bersaldo Rp0 → percobaan mendaftar toko kedua ditolak (`"Anda sudah memiliki toko terdaftar"`) → `POST /api/stores/:id/verify` oleh sesi `SUPER_ADMIN` memindahkan status ke `ACTIVE` → percobaan verifikasi kedua ditolak (`"Toko berstatus ACTIVE, tidak bisa diverifikasi"`) → query langsung ke `wallet_accounts` mengonfirmasi dua baris terpisah untuk pemilik yang sama: satu `account_type = 'USER'` (dompet pribadi) dan satu `account_type = 'STORE'` (dompet toko), keduanya bersaldo independen. Seluruh data uji (wallet, wallet_account, store, role, PIN, sesi) sudah dibersihkan setelahnya; satu baris `users` tersisa di database dev karena tertahan oleh jejak `audit_logs`-nya sendiri (tabel itu *append-only*, sesuai desain proyek ini) — tidak berbahaya, tidak dipakai fitur apa pun, dan tidak pernah menyentuh produksi.

**Kriteria Tahap 2 (§9) terpenuhi**: toko bisa dibuat, diverifikasi, dan punya dompet bersaldo Rp0 yang sepenuhnya terpisah dari dompet pribadi pemiliknya.

---

## 10. Uji coba terbatas

Sebelum membangun sisa fitur di §3, jalankan uji coba ke **5–10 warung nyata** selama satu bulan. Data dari uji coba ini akan menjawab pertanyaan model bisnis jauh lebih baik daripada asumsi mana pun di dokumen ini.

| Yang diukur | Kenapa ini yang diukur | Ambang lanjut |
|---|---|---|
| Saldo yang masuk lewat toko, bukan lewat top up bank | **Metrik utama.** Inilah alasan fitur ini dibangun. | ≥ 20% dari total saldo masuk di wilayah pilot |
| Saldo toko yang dibelanjakan kembali jadi produk PPOB | Membuktikan lingkaran §1 benar-benar tertutup. | ≥ 70% dari saldo yang diterima |
| Toko yang bertransaksi mingguan | Jumlah toko terdaftar mudah dibanggakan tapi tidak berarti apa-apa. | ≥ 60% toko pilot |
| Pembeli yang membayar lebih dari sekali | Menguji sisi permintaan, bukan hanya kesediaan merchant. | ≥ 40% |
| Tingkat keberhasilan pembayaran | Warung desa punya sinyal tidak stabil — menguji ketahanan alur. | ≥ 95% |
| Saldo yang dikonversi ke E-Money | Kalau tinggi, merchant lebih butuh uang tunai daripada modal pulsa — hipotesis §1 perlu ditinjau ulang. | diamati, bukan ambang |

Kriteria berhenti sama pentingnya: bila setelah satu bulan mayoritas toko pilot berhenti memakainya, masalahnya ada pada permintaan pasar — menambah fitur tidak akan memperbaikinya.

---

## 11. Risiko

| Risiko | Dampak | Penanganan |
|---|---|---|
| Sinyal putus di tengah transaksi kasir | Sering terjadi — target pasarnya justru daerah bersinyal lemah | Status pembayaran selalu dibaca dari server; kasir boleh menutup layar dan membukanya lagi tanpa risiko dobel bayar. |
| Dua perangkat kasir menjual stok terakhir bersamaan | Stok minus | Diterima di MVP dengan batas: stok tidak boleh turun di bawah nol di tingkat basis data. Reservasi stok masuk fase berikutnya. |
| Refund setelah merchant membelanjakan hasil penjualan | Saldo toko tidak cukup untuk dikembalikan | Refund sengaja tidak masuk MVP. Aturan siapa yang menanggung harus diputuskan sebelum fitur refund dibangun. |
| Perutean dompet salah pada kode lama | Uang terdebit dari dompet yang keliru | Dikerjakan sebagai tahap tersendiri (§9 Tahap 1) dengan verifikasi jejak transaksi produksi sebelum fitur toko disentuh. |
| Warung tidak berminat jualan pulsa | **Risiko adopsi terbesar.** Ia merasa menukar barang nyata dengan saldo yang tak terpakai, lalu berhenti menerima | Pilot dibatasi ke warung yang sudah/ingin jualan pulsa. Kalau di segmen itu pun tidak jalan, masalahnya ada di permintaan pasar — bukan di fitur. |
| Pencairan informal lewat transfer saldo | Merchant mengirim saldo ke seseorang yang membayarnya tunai | Dompet `STORE` dilarang jadi sumber transfer (§6 aturan 9). Konversi hanya lewat pembelian produk E-Money yang tercatat sebagai penjualan biasa. |
| Salah ketik nomor tujuan saat konversi ke E-Money | Uang merchant hilang permanen, tidak bisa ditarik kembali | Verifikasi nama penerima dijadikan langkah wajib di atas nominal tertentu; fiturnya sudah ada dan hasilnya kini tersimpan di histori. |

---

## 12. Sesudah MVP

Disebutkan agar skema data disiapkan sejak awal, *bukan* agar dibangun sekarang.

- **Karyawan & peran akses** — kolom pemilik dan peran sudah disiapkan di `043`, alurnya menyusul.
- **Refund** — bergantung pada aturan penanggung yang belum diputuskan.
- **Reservasi stok** — begitu ada toko dengan lebih dari satu kasir.
- **Pembayaran antar-merchant** — warung membeli stok dari warung/agen lain memakai saldo toko. Ini memperdalam lingkaran §1 tanpa menyentuh uang tunai sama sekali.
- **Peninjauan markup E-Money** — bukan fitur, tapi perlu: markup yang wajar di nominal 50rb–100rb terasa mencekik di nominal kecil (contoh nyata: DANA 1.000 modal Rp1.100 dijual Rp1.700), padahal kategori ini kini jadi jalur konversi merchant.
- **Verifikasi nama wajib untuk E-Money bernominal besar** — salah ketik nomor tujuan berarti uang hilang permanen. Fitur cek namanya sudah ada, tinggal dijadikan langkah wajib.
