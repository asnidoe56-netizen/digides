# Flow Kerja dan Batasan Kerja Transaksi

> **STATUS: 🔒 DIKUNCI.** Dokumen ini menetapkan alur kerja transaksi PPOB (pembelian ke Digiflazz) yang sudah diverifikasi bekerja benar di produksi per 2026-09-03, dan diamandemen + diverifikasi ulang per 2026-09-07 (Bagian 5a, mekanisme SKU cadangan otomatis). Bagian yang ditandai 🔒 di bawah **tidak boleh diubah** pada sesi kerja berikutnya tanpa instruksi eksplisit dan sadar dari pemilik produk — bukan sekadar "sedang memperbaiki bug lain di dekatnya". Dokumen ini juga menjadi **acuan pola** untuk layanan/kategori pembayaran baru yang akan dibangun di atas fondasi yang sama.
>
> Bagian 5a adalah amandemen sadar atas aturan #3/#8 versi sebelumnya, diinstruksikan eksplisit oleh pemilik produk pada 2026-09-07, dan sudah lolos uji nyata end-to-end di produksi pada hari yang sama (lihat catatan verifikasi lengkap di akhir Bagian 5a) — termasuk kasus SKU asli Gagal dua kali berturut-turut lalu SUKSES lewat cadangan kedua, dengan ledger saldo terbukti tepat satu RESERVE dan satu DEBIT.
>
> Bagian 5b adalah perbaikan bug pada `createTransaction`, diinstruksikan eksplisit oleh pemilik produk pada 2026-09-08 setelah ditemukan saat mengerjakan PRD Digides Toko Tahap 1 (`docs/product/PRD_DIGIDES_TOKO.md` §7a). Ini bukan perubahan aturan — aturan #3 (idempotency) tetap sama persis — melainkan perbaikan cara aturan itu **diimplementasikan** supaya benar-benar bekerja seperti yang sudah didokumentasikan. Dibuktikan lewat reproduksi langsung di database (bug lama dan perbaikannya sama-sama direproduksi berdampingan, bukan sekadar menunggu kejadian nyata) — lihat Bagian 5b untuk buktinya.
>
> Bagian 5c dulunya menambahkan pilihan **sumber dana** pembelian (dompet pribadi atau dompet toko sendiri), diinstruksikan pemilik produk pada 2026-09-08. **Kemampuan itu sudah ditarik kembali pada 2026-09-09** — bagiannya dibiarkan utuh sebagai catatan sejarah, tapi jangan dipakai sebagai acuan.
>
> Bagian 5d adalah aturan yang **berlaku sekarang**: pembelian selalu didanai saldo utama, dan saldo toko harus dipindahkan dulu ke saldo utama lewat jalur tersendiri. Diputuskan eksplisit oleh pemilik produk pada 2026-09-09 dengan alasan pembukuan — buku toko harus terbaca sebagai buku warung. Mesin transaksinya sendiri tetap tidak pernah disentuh, baik oleh 5c maupun 5d.

---

## 1. Alur Lengkap Satu Transaksi

Berlaku untuk setiap pembelian PPOB (PLN, Pulsa, Data, E-Money, Games, Gas, TV, Voucher, Masa Aktif, Paket SMS & Telpon, Aktivasi Perdana, Aktivasi Voucher) di Web maupun Flutter.

```
1. Mitra tekan PIN ke-6 (atau sidik jari)
        │
        ▼
2. Client kirim 1x request "eksekusi transaksi" ke server kita
   (overlay spinner "Sedang Diproses" tampil di sini)
        │
        ▼
3. Server kita reservasi saldo (RESERVE), lalu kirim 1x request
   SINKRON ke Digiflazz POST /v1/transaction
   Digiflazz balas LANGSUNG saat itu juga: Sukses / Gagal / Pending
        │
        ├── Sukses → captureTransaction() → status SUCCESS, ledger DEBIT, token/sn tersimpan
        ├── Gagal  → releaseTransaction() → status FAILED, ledger RELEASE (saldo balik)
        └── Pending (rc:03) → status tetap RESERVED, dicatat di transaction_events
                │
                ▼  (kalau Pending)
4. Server balas ke client: status PENDING
   → overlay spinner submit hilang, layar pindah ke tampilan hasil
        │
        ├──────────────────────────────┐
        ▼                              ▼
5a. Client mulai POLLING            5b. Digiflazz (terpisah, async) selesai
    GET /api/transactions/:id           memproses, lalu KIRIM WEBHOOK:
    tiap 3 detik, maksimal 20x          POST /api/webhooks/digiflazz
    (client bertanya ke SERVER              │
    KITA sendiri, bukan Digiflazz)          ▼
        │                     6. Server verifikasi signature (X-Hub-Signature,
        │                        HMAC-SHA1 atas raw body) → applyDigiflazzResult()
        │                        → UPDATE transactions jadi SUCCESS/FAILED
        └──────────────┬───────────────┘
                        ▼
        7. Polling berikutnya (≤3 detik lagi) membaca DB yang
           sudah ter-update → client tampilkan hasil akhir
```

**Fakta empiris terverifikasi di produksi (2026-09-03):** latensi ujung-ke-ujung dari submit sampai token PLN/DANA muncul konsisten **2–7 detik**, dikonfirmasi lewat pencocokan timestamp presisi-detik antara `transactions.updated_at` dan baris log `POST /api/webhooks/digiflazz → 200 OK` di nginx, berulang di banyak transaksi nyata lintas kategori (PLN, Pulsa, E-Money).

---

## 2. Dua Jalur yang Terpisah — Jangan Dicampur Pemahamannya

| Jalur | Arah | Mekanisme | Fungsi/lokasi kode |
|---|---|---|---|
| Digiflazz → Server kita | **Push** (Digiflazz yang mendorong kabar) | Webhook, `X-Hub-Signature` HMAC-SHA1 | `processDigiflazzWebhookEvent` (`src/services/transaction.service.ts`), route `src/app/api/webhooks/digiflazz/route.ts` |
| Client (Web/Flutter) → Server kita | **Pull** (client yang bertanya) | Polling bounded 3 detik × 20x (≤60 detik) | Web: `category-purchase-flow.tsx` `useEffect`; Flutter: `_startPolling`/`_pollOnce` (`purchase_screen.dart`) |
| Server kita → Digiflazz (cadangan) | **Pull** (server yang bertanya balik) | Job reconciliation, interval 3 menit, tanpa batas waktu menyerah | `runPendingTransactionCheck` (`src/jobs/pending-transaction-check.ts`), dipicu `instrumentation.ts` |

Client **tidak pernah** bicara langsung ke Digiflazz. Status yang dilihat mitra di layar selalu berasal dari database kita sendiri, yang diperbarui lewat webhook (cepat, jalur utama) atau job reconciliation (lambat, jalur cadangan kalau webhook tidak kunjung datang).

---

## 3. Cakupan — Komponen Mana yang Dipakai Kategori Mana

**Flutter**: satu komponen `PurchaseScreen` dipakai oleh **seluruh 12 kategori** yang terdaftar di `categoryConfigs` (`lib/features/home/category_config.dart`) — bukan komponen terpisah per kategori. Alur PIN (`PurchasePinScreen`) dan hasil (`PurchaseResultScreen`) karena itu otomatis identik untuk semua kategori.

`PurchasePinScreen` juga dipakai ulang oleh dua fitur di luar PPOB:
- `transfer_screen.dart` (transfer saldo antar akun) — **tidak ada status Pending** di sini (transfer selalu sinkron/langsung), jadi overlay submit tetap berlaku tapi spinner-Pending Bagian 5 tidak relevan.
- `biometric_security_screen.dart` (konfirmasi PIN saat aktivasi sidik jari) — juga tanpa konsep Pending.

**Web**: pola yang sama — 12 halaman kategori di `src/app/dashboard/konter/*/page.tsx` (dan padanannya di `bumdes/*`) semua memakai `CategoryPurchaseFlow` yang sama, yang di dalamnya merender `PurchaseResultScreen` (`src/features/mitra-purchase/components/purchase-result-screen.tsx`).

**Terverifikasi langsung di produksi**: PLN, Pulsa, E-Money. Kategori lain (Data, Games, TV, Gas, Voucher, Masa Aktif, Paket SMS & Telpon, Aktivasi Perdana/Voucher) belum pernah diamati mengalami status Pending secara nyata — tapi karena rc:03 Pending adalah mekanisme umum Digiflazz (bukan khusus PLN/Pulsa) dan jalur kodenya identik, seharusnya berperilaku sama.

---

## 4. Tampilan UI Saat Ini (state visual)

| Kondisi | Tampilan |
|---|---|
| Submit PIN/biometrik sedang berjalan | Overlay dim + kartu putih + spinner berputar + "Sedang Diproses" / "Mohon tunggu sebentar..." |
| Status PENDING, polling masih aktif (< 60 detik) | Spinner berputar (`Loader2` di web, `CircularProgressIndicator` di Flutter) menyambung dari overlay submit, judul "Transaksi Sedang Diproses" |
| Status PENDING, polling sudah menyerah (timedOut) | Ikon jam/jam-pasir **diam** (`Clock`/`Icons.hourglass_top`) + pesan "masih diproses provider, cek Histori beberapa saat lagi" |
| Status SUCCESS | Ikon centang hijau, detail transaksi, token PLN (kalau ada) ditampilkan bersih (hanya nomor, nama/tarif/daya/kwh dipisah jadi baris sendiri via `parsePlnToken`/`parsePlnToken` Dart) |
| Status FAILED | Ikon silang merah, saldo sudah otomatis dikembalikan |

---

## 5. 🔒 Batasan yang TIDAK BOLEH Diubah

Daftar ini murni tentang **logika**, bukan tampilan (lihat Bagian 6 untuk yang boleh disentuh).

1. **Verifikasi signature webhook** — `verifyDigiflazzWebhookSignature` (`src/lib/digiflazz/webhook.ts`): SHA1 HMAC atas raw body, header `X-Hub-Signature`, `timingSafeEqual`. Sudah dikonfirmasi sesuai dokumentasi resmi Digiflazz persis.
2. **Autentikasi & pengiriman transaksi ke Digiflazz** — `submitDigiflazzTransaction` (`src/lib/digiflazz/transaction.ts`): formula signature `md5(username+apiKey+ref_id)`, parameter wajib, `testing` flag hanya untuk mode development.
3. **Idempotency** — `ref_id` yang dikirim ke Digiflazz SELALU `transactions.idempotency_key`, tidak pernah dibuat ulang untuk transaksi yang sama. Re-submit dengan `ref_id` sama = cek status, bukan pembelian baru. **Pengecualian tunggal, disengaja (lihat Bagian 5a)**: mekanisme SKU-cadangan-otomatis BOLEH membuat ulang `idempotency_key` pada baris `transactions` yang SAMA (id sama), tapi hanya lewat `swapTransactionProductForBackup` (`src/repositories/transaction.repository.ts`), dipanggil hanya dari `trySwapToBackupSku` (`src/services/transaction.service.ts`), dan tidak pernah untuk alasan lain apa pun. **Perbaikan implementasi (lihat Bagian 5b)**: mekanisme "re-submit dengan ref_id sama = cek status" ini sendiri sempat rusak di `createTransaction` — perbaikannya tidak mengubah aturan ini sama sekali, hanya membuat implementasinya benar-benar berjalan sesuai yang tertulis di sini.
4. **Reservasi/pelepasan saldo** — `postLedgerEntry` (RESERVE/DEBIT/RELEASE), selalu di dalam `withTransaction()` dengan row locking. `applyDigiflazzResult` adalah satu-satunya titik yang boleh memanggil `captureTransaction`/`releaseTransaction`.
5. **State machine status transaksi** — `transitionTransactionStatus` (compare-and-swap). Kedua jalur (respons sinkron & webhook) **wajib** funnel lewat fungsi `applyDigiflazzResult` yang sama persis — jangan pernah dibuat jalur kedua yang terpisah.
6. **Cadence polling client**: 3 detik × 20x percobaan (≤60 detik total). Ini nilai yang sudah diuji nyaman secara UX dan aman terhadap batas rate-limit Digiflazz (rc 85, "1 menit sekali" per dokumentasi resmi).
7. **Interval job reconciliation**: 3 menit (`CHECK_INTERVAL_MS`, `src/jobs/pending-transaction-check.ts`). Jangan dipercepat tanpa mempertimbangkan ulang rc 85/86 (limitasi transaksi & limitasi cek nomor PLN dari Digiflazz).
8. **Tidak pernah membuat transaksi kedua** — tidak ada kondisi apa pun (retry, timeout, error jaringan) yang boleh memicu `submitDigiflazzTransaction` dipanggil dengan `ref_id` baru untuk niat pembelian yang sama. **Pengecualian tunggal, disengaja (lihat Bagian 5a)**: saat Digiflazz menjawab **"Gagal"** (bukan timeout, bukan error jaringan — jawaban definitif), mekanisme SKU-cadangan-otomatis boleh memicu `submitDigiflazzTransaction` sekali lagi untuk SKU **lain** (nominal sama, produk berbeda) pada baris transaksi yang sama, maksimal `MAX_BACKUP_SKU_ATTEMPTS` (2) kali. Ini tetap bukan "transaksi kedua" untuk niat pembelian yang sama secara longgar — setiap percobaan adalah usaha genuinely baru untuk memenuhi permintaan pembeli yang sama dengan produk yang berbeda, bukan mengulang permintaan yang identik.

---

## 5a. 🔒 Mekanisme SKU Cadangan Otomatis (Amandemen 2026-09-07)

**Latar belakang**: sebelum amandemen ini, SKU termurah yang gagal (mis. kehabisan stok di Digiflazz) langsung membuat transaksi gagal dan saldo pembeli dikembalikan — walau ada SKU lain aktif dengan nominal yang identik. Pemilik produk meminta sistem otomatis mencoba SKU cadangan itu, sepenuhnya tidak terlihat oleh pembeli, dengan harga jual ke pembeli tidak pernah berubah.

**Cara kerja** (lihat komentar kode untuk detail lengkap — ini ringkasannya):

1. **Titik pemicu tunggal**: `applyDigiflazzResult`'s cabang `"Gagal"` (`src/services/transaction.service.ts`) — TIDAK ada jalur kedua. Berlaku otomatis untuk ketiga sumber yang bisa melaporkan "Gagal" (submit sinkron pertama, webhook Digiflazz, job reconciliation) karena ketiganya sudah funnel lewat fungsi yang sama (aturan #5 tetap utuh).
2. **Pencarian kandidat cadangan** — `findBackupProductCandidates` (`src/repositories/product.repository.ts`): SKU lain di grup `(category_id, brand_id, product_name)` yang sama (kunci pengelompokan "nominal sama" yang SAMA PERSIS dengan yang sudah dipakai `listCheapestActiveProducts` untuk menampilkan SKU termurah ke pembeli hari ini), status `ACTIVE`, `admin_disabled = false`, kategori & brand masih aktif (dicek ulang tiap percobaan), dan **modal (`base_price`) SKU cadangan harus lebih kecil dari `selling_price` yang sudah dikunci ke pembeli** — kalau tidak ada yang memenuhi, dianggap tidak ada cadangan valid.
3. **Klaim atomik** — `trySwapToBackupSku` mengunci baris transaksi (`lockTransactionForUpdate`, `SELECT ... FOR UPDATE` di dalam `withTransaction`) sebelum memilih & mengklaim satu kandidat lewat `swapTransactionProductForBackup`, MENGGANTI `product_id`/`base_price`/`idempotency_key` pada baris **yang sama** (id tidak berubah) — **`selling_price` TIDAK PERNAH disentuh**. Lock hanya dipegang selama baca-putuskan-tulis di database, TIDAK PERNAH melintasi panggilan jaringan ke Digiflazz (konsisten dengan pola reservasi saldo yang sudah ada).
4. **Percobaan ulang** — setelah klaim commit, `settleWithProvider` dipanggil lagi (di luar lock) dengan `ref_id` baru dan SKU cadangan. Hasilnya funnel lagi lewat `applyDigiflazzResult` yang sama — kalau "Gagal" lagi, ulangi dari langkah 2 (maksimal `MAX_BACKUP_SKU_ATTEMPTS = 2` kali cadangan; total maksimal 3 percobaan Digiflazz per pembelian). Kalau cadangan habis atau tidak ada yang valid, baru jatuh ke `releaseTransaction` seperti sebelum amandemen ini.
5. **Tidak menyentuh ledger sama sekali** — reservasi saldo (`RESERVE`) yang sudah dibuat untuk `selling_price` di awal tetap berlaku sepanjang rangkaian percobaan; tidak ada lepas-lalu-tahan-ulang, sehingga tidak ada celah saldo "bebas sesaat" untuk transaksi lain.
6. **Tidak terlihat pembeli sama sekali** — karena ID transaksi (`transactions.id`) tidak pernah berubah, aplikasi Flutter/web yang sedang polling `GET /api/transactions/:id` tetap melihat transaksi yang sama, tanpa perubahan kode apa pun di kedua platform. Fallback "masih diproses, cek Histori nanti" yang sudah ada (Bagian 4) otomatis menyerap tambahan waktu kalau rangkaian percobaan ini kebetulan makan waktu lebih lama dari biasanya.
7. **Komisi tidak pernah minus** — `awardCommissionForTransaction` (`src/services/commission.service.ts`) membatasi komisi maksimal sebesar profit riil transaksi (`selling_price - base_price`, dari SKU yang BENAR-benar sukses) — supaya digides tidak pernah membayar komisi lebih besar dari keuntungan yang benar-benar didapat di transaksi itu.
8. **Jejak audit** — `original_product_id` (SKU pertama, tidak pernah berubah) dan `tried_product_ids` (semua SKU yang pernah dicoba, urut) tersimpan di baris `transactions` itu sendiri (`041_transaction_backup_sku.sql`); setiap pergantian juga dicatat sebagai `transaction_events` baru (`event: "BACKUP_SKU_SWAPPED"`) dan ditampilkan ke Super Admin di halaman Detail Transaksi.

**Risiko yang diketahui, disengaja belum ditutup sepenuhnya** (gaya yang sama seperti Bagian 7):
- Kalau webhook Digiflazz dan job reconciliation kebetulan mendeteksi "Gagal" pada jendela yang sangat sempit untuk transaksi yang sama, klaim SKU cadangan (langkah 3) sudah mencegah keduanya mengklaim SKU cadangan yang SAMA — tapi secara teori keduanya masih bisa mengklaim SKU cadangan yang BERBEDA dan mengirim keduanya ke Digiflazz nyaris bersamaan. Belum pernah teramati (webhook biasanya tiba 2–7 detik, job reconciliation tiap 3 menit — jendela tabrakannya sangat sempit), dan risikonya sama kelasnya dengan race sejenis yang sudah diterima di Bagian 7.
- Kalau baris transaksi sempat diganti SKU (idempotency_key berubah), lalu Digiflazz mengirim ULANG webhook untuk `ref_id` LAMA (mis. webhook resend Digiflazz sendiri) setelah pergantian terjadi, `findTransactionByIdempotencyKey` untuk `ref_id` lama itu tidak akan menemukan transaksinya lagi (sudah berganti ke `ref_id` baru) — webhook resend itu akan gagal dengan "Transaksi tidak ditemukan", bukan korupsi data, hanya diabaikan.

**Verifikasi — SELESAI, terkonfirmasi lewat dua kejadian nyata di produksi pada 2026-09-07:**

*Kejadian #1 (transaksi `8030b311-...`, channel WEB) — rantai cadangan habis, berhenti dengan benar:*
- [x] SKU asli Gagal → otomatis pindah ke cadangan #1 → Gagal lagi → otomatis pindah ke cadangan #2 → Gagal lagi → cadangan habis (2x sesuai batas) → transaksi Gagal secara normal, saldo Rp2.855 dikembalikan.
- [x] Ledger saldo tersentuh tepat sekali (1 RESERVE, 1 RELEASE) meski 3 percobaan submit berbeda ke Digiflazz.
- [x] Harga jual tidak berubah (tetap Rp2.855) walau modal berbeda di tiap SKU (2.355 → 2.555 → 2.705).

*Kejadian #2 (transaksi `10c8a134-...`, channel WEB) — rantai cadangan BERHASIL, nilai bisnis utama terbukti:*
- [x] **SKU asli ("Promo") Gagal** ("Produk Seller Sedang Tidak Tersedia") → otomatis pindah ke cadangan #1 ("s5") → **Gagal lagi** → otomatis pindah ke cadangan #2 ("sc5") → **SUKSES**, token diterbitkan (`sn: 04267800000534561668.`). Transaksi yang tadinya akan Gagal berakhir SUKSES sepenuhnya otomatis — inilah nilai bisnis utama fitur ini, dan sudah terbukti nyata.
- [x] Ledger saldo tersentuh tepat sekali (1 RESERVE, 1 DEBIT) — Rp5.510 persis, walau 3 SKU berbeda dicoba (modal 5.010 → 5.130 → 5.200).
- [x] Setiap pergantian SKU tercatat lengkap di `transaction_events` (`BACKUP_SKU_SWAPPED`) berikut alasan Gagal Digiflazz (rc/pesan) untuk SKU yang ditinggalkan.
- [x] Harga jual tidak berubah (tetap Rp5.510) dari awal sampai SUKSES, walau modal akhir (Rp5.200) berbeda dari modal asli (Rp5.010) — keuntungan digides otomatis menyesuaikan (dari Rp500 jadi Rp310), sesuai desain.

*Untuk kedua ID transaksi di atas:*
- [x] ID transaksi (`transactions.id`) tidak pernah berubah sepanjang seluruh rantai percobaan — pembeli hanya pernah melihat satu transaksi.
- [x] Tidak ada kejanggalan tampilan (tidak ada transaksi ganda, tidak ada pesan error yang salah) — **catatan jujur**: kejadian #2 makan waktu ~25 menit (jauh melewati jendela polling klien 60 detik), jadi pembeli kemungkinan besar sempat melihat layar "masih diproses, cek Histori beberapa saat lagi" (perilaku timeout yang sudah ada, Bagian 4) sebelum akhirnya mengecek Histori dan melihat hasil SUKSES. Ini bukan bug — hanya berarti hasil akhirnya tidak selalu instan kalau webhook/reconciliation butuh waktu lebih lama, sama seperti transaksi Pending biasa sebelum fitur ini ada.

Komisi belum diamati secara langsung pada kejadian #2 (tergantung apakah pembeli punya relasi referral aktif), tapi rumusnya (`MIN(komisi_aturan, selling_price - base_price)`) sudah diverifikasi lewat pemeriksaan kode dan tidak bergantung pada skenario cadangan secara khusus.

---

## 5b. 🔒 Perbaikan Mekanisme Idempotency `createTransaction` (Amandemen 2026-09-08)

**Ini perbaikan bug, bukan perubahan aturan.** Aturan #3 (idempotency) tetap persis sama seperti sebelumnya — dokumen ini sudah lama menjanjikan "re-submit dengan `ref_id` sama = cek status, bukan pembelian baru". Yang ternyata rusak adalah **implementasi** janji itu di satu titik spesifik, ditemukan tidak sengaja saat mengerjakan PRD Digides Toko Tahap 1 (`docs/product/PRD_DIGIDES_TOKO.md` §7a) ketika bug yang bentuknya identik lebih dulu ditemukan di fitur Transfer yang baru dibuat.

**Bug yang ditemukan**: `createTransaction` (`src/repositories/transaction.repository.ts`) sebelumnya memakai pola *try/catch*: coba `INSERT`, kalau kena `UNIQUE constraint` (kode error Postgres 23505) berarti `idempotency_key` sudah pernah dipakai, lalu di dalam blok `catch` menjalankan `SELECT` untuk mengambil baris yang sudah ada dan mengembalikannya sebagai hasil (bukan error). Masalahnya: `executeTransaction` selalu memanggil `createTransaction` di dalam `client` yang sama dari `withTransaction()` (koneksi database yang sedang menjalankan satu transaksi terbuka) — dan di PostgreSQL, begitu SATU perintah di dalam transaksi terbuka gagal, SELURUH transaksi itu langsung berstatus "aborted": setiap perintah berikutnya di koneksi yang sama, termasuk `SELECT` fallback yang seharusnya menyelamatkan situasi, akan ikut ditolak dengan pesan `current transaction is aborted, commands ignored until end of transaction block`.

**Dampak nyata**: kalau seorang mitra sudah memasukkan PIN yang benar, tapi jaringan sempat putus SETELAH server memproses permintaan tapi SEBELUM respons sampai ke aplikasi, lalu aplikasi otomatis mengirim ulang permintaan yang sama (dengan `idempotencyKey` yang sama, persis skenario yang memang dirancang aturan #3 untuk ditangani) — permintaan kedua itu akan gagal dengan error Postgres yang membingungkan, BUKAN mengembalikan hasil transaksi asli yang sebenarnya sudah berhasil/sedang diproses. **Bukan salah kirim uang** (`INSERT` kedua tetap tidak pernah benar-benar tersimpan), tapi jalur pemulihan yang seharusnya jadi jaring pengaman utama justru ikut gagal.

**Perbaikan**: mengganti pola *try/catch* dengan `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`. Klausa ini tidak pernah memicu error sama sekali kalau `idempotency_key`-nya sudah ada — `INSERT` itu diam-diam tidak menyisipkan apa pun dan `RETURNING` mengembalikan nol baris, sehingga transaksi database tetap sehat dan `SELECT` fallback (mengambil baris yang sudah ada) selalu berhasil dijalankan. Pola yang sama persis sudah diterapkan dan diverifikasi lebih dulu pada `createWalletTransfer` (`src/repositories/wallet.repository.ts`, migrasi `043_wallet_transfers.sql`) sebelum diterapkan di sini.

**Verifikasi — SELESAI, dibuktikan lewat reproduksi langsung di database (bukan menunggu kejadian nyata, karena ini murni mekanisme Postgres yang deterministik, bisa direproduksi kapan saja):**
- [x] **Pola LAMA direproduksi ulang persis** — `INSERT` biasa (tanpa `ON CONFLICT`) dengan `idempotency_key` yang sudah ada, di dalam satu blok transaksi, diikuti `SELECT` yang sama seperti fallback lama: `INSERT` gagal dengan `duplicate key value violates unique constraint`, lalu `SELECT` berikutnya BENAR-BENAR ikut gagal dengan `current transaction is aborted, commands ignored until end of transaction block` — persis bug yang dicurigai, terbukti nyata bukan sekadar teori.
- [x] **Pola BARU (`ON CONFLICT DO NOTHING`) diuji berdampingan** dengan data nyata (wallet & produk asli dari database) — `INSERT` kedua dengan `idempotency_key` yang sama mengembalikan nol baris TANPA error apa pun, dan `SELECT` fallback setelahnya berhasil sempurna mengambil baris transaksi asli.
- [x] Kode lulus `tsc --noEmit` tanpa error.
- [x] Baris data uji dibersihkan setelah verifikasi (tabel `transactions` sendiri tidak immutable, berbeda dari `transaction_events`/`wallet_ledger`).
- [ ] **Belum diamati**: kejadian nyata di produksi (mitra benar-benar mengirim ulang pembelian yang sama karena jaringan putus). Ini kejadian yang jarang secara alami, jadi kemungkinan besar tidak akan teramati dalam waktu dekat — bukti mekanisme di atas (reproduksi langsung, bukan menunggu) dianggap cukup untuk mengunci ulang bagian ini, karena sifatnya deterministik (perilaku PostgreSQL yang sama setiap kali, bukan skenario bisnis yang bergantung stok/keberuntungan seperti Bagian 5a).

---

## 5c. ⛔ Sumber Dana Pembelian: Dompet Pribadi atau Dompet Toko (Amandemen 2026-09-08 — **DITARIK 2026-09-09, lihat Bagian 5d**)

> **Bagian ini sudah tidak berlaku.** Kemampuan `payWith` ditarik satu hari setelah dibuat, atas keputusan pemilik produk. Isinya dibiarkan utuh sebagai catatan sejarah — supaya jelas apa yang pernah ada, apa yang sudah terbukti bekerja, dan kenapa akhirnya dilepas. Untuk aturan yang berlaku sekarang, baca Bagian 5d.

**Ini penambahan pilihan sumber dana, bukan perubahan mesin transaksi.** Diinstruksikan eksplisit oleh pemilik produk pada 2026-09-08 ("kerjakan semua temuan") setelah analisis pasca-Tahap 3 menemukan bahwa saldo yang terkumpul di dompet toko sama sekali **tidak bisa dibelanjakan** — yang membatalkan seluruh premis ekonomi Digides Toko (`docs/product/PRD_DIGIDES_TOKO.md` §1: *"jualan sembako Anda otomatis jadi modal jualan pulsa"*), karena separuh "belanja" dari lingkaran itu tidak pernah dibangun.

**Yang berubah — hanya satu berkas, dan bukan `transaction.service.ts`**: `src/app/api/transactions/execute/route.ts` sekarang menerima satu field opsional `payWith` (`"PERSONAL"` | `"STORE"`). Mesin transaksinya sendiri (`executeTransaction` dan seluruh alur RESERVE → provider → DEBIT/RELEASE, webhook, polling) **tidak disentuh sama sekali** — ia sejak awal menerima `walletId` dari pemanggilnya; yang berubah hanyalah dompet mana milik penelepon sendiri yang diserahkan ke sana.

**Jaminan yang tetap dipegang:**
1. **`payWith` adalah pemilih sumber, bukan id dompet.** Klien tetap tidak pernah bisa menyebut dompet mana pun; dompetnya tetap diresolusi 100% di server dari sesi penelepon sendiri. Tidak mungkin membelanjakan dompet orang lain, sama seperti sebelumnya.
2. **Tanpa `payWith`, perilakunya identik dengan sebelum amandemen ini** — tetap `getWalletForMitraSession`, dompet pribadi/operasional. Kedua klien yang ada (web dan aplikasi mitra) tidak mengirim field ini dan sama sekali tidak terpengaruh.
3. **`"STORE"` hanya bisa menjangkau toko milik penelepon sendiri, dan hanya bila toko itu berstatus `ACTIVE`** (`getSpendableStoreWalletForOwner` di `src/services/store.service.ts`). Toko yang belum diverifikasi atau disuspend tidak bisa membelanjakan saldonya.
4. **Aturan #9 PRD Toko tetap utuh**: dompet toko boleh berbelanja di katalog Digides, tapi tetap tidak pernah bisa menjadi sumber transfer saldo ke pengguna lain — `transferToDownline` tetap hanya memakai `getWalletForMitraSession`, yang menurut kontraknya tidak pernah mengembalikan dompet `STORE`.
5. **Komisi**: pembelian yang didanai dompet toko **tidak menghasilkan komisi untuk siapa pun**. Ini bukan kecelakaan — `getOwningUserId` memang mengembalikan `null` untuk dompet `STORE` (tidak ada `user_id` pada baris arc-nya), dan `awardCommissionForTransaction` menangani itu dengan `return []` yang bersih, bukan error. Sudah didokumentasikan sebagai default sengaja sejak Tahap 1. Kalau nanti diputuskan pembelian toko juga harus memberi komisi ke upline pemiliknya, itu perubahan satu keputusan produk — dicatat di sini supaya pilihannya sadar, bukan tersembunyi.

**Satu perubahan urutan yang perlu dicatat**: resolusi dompet sekarang terjadi SESUDAH validasi skema (dulu sebelumnya), karena dompet mana yang dipakai bergantung pada isi body. Efeknya hanya pada pesan error mana yang muncul lebih dulu bila body tidak valid DAN dompet tidak ada — sebelumnya "Wallet tidak ditemukan", sekarang "Data tidak valid". Tidak ada dampak finansial.

**Verifikasi — SELESAI, diuji lewat HTTP nyata dengan rancangan yang tidak mungkin memicu pembelian sungguhan (dev lokal memakai kredensial Digiflazz produksi, jadi pembelian nyata = uang nyata):**
- [x] **Urutan operasi diperiksa lebih dulu**: `RESERVE` (pengurangan saldo) terjadi di `executeTransaction` **sebelum** `settleWithProvider` memanggil Digiflazz — sehingga kegagalan "saldo tidak cukup" dijamin berhenti sebelum provider tersentuh.
- [x] **Penjaga "belum punya toko"**: akun tanpa toko + `payWith:"STORE"` ditolak (`"Anda belum memiliki toko terdaftar"`).
- [x] **Penjaga "toko belum diverifikasi"**: toko berstatus `SUBMITTED` + `payWith:"STORE"` ditolak (`"Toko Anda belum diverifikasi, saldonya belum bisa dibelanjakan"`).
- [x] **Uji menentukan**: dompet pribadi diisi Rp100.000 (lebih dari cukup) sementara dompet toko hanya Rp6.000, lalu `payWith:"STORE"` untuk produk seharga ±Rp19.000 → gagal `"Saldo tidak cukup"`. Kalau kode diam-diam memakai dompet pribadi, transaksi ini justru akan BERHASIL — jadi kegagalannya sendiri adalah buktinya bahwa dompet toko benar-benar yang dipakai. Varian `PERSONAL`-nya sengaja **tidak** dijalankan justru karena akan berhasil dan memanggil Digiflazz sungguhan.
- [x] Sesudahnya: kedua saldo tidak bergerak sama sekali dan tidak ada baris `transactions` tersisa (rollback bersih).
- [x] Saldo uji dikembalikan lewat baris ledger `ADJUSTMENT` baru (bukan UPDATE langsung, sesuai aturan #7 PRD Toko), dan hak Super Admin sementara dicabut kembali.
- [x] Kode lulus `tsc --noEmit` dan `npm run build`.
- [x] **Teramati nyata di produksi (2026-09-08 18:07)**: pembelian DANA 1.000 seharga Rp1.700 oleh Sidik Mohamad benar-benar didanai dompet toko "Alfat Mart" dan berhasil di Digiflazz dalam 2 detik. Ini sekaligus satu-satunya transaksi berdana toko yang pernah ada — lihat catatan di Bagian 5d soal kenapa ia harus tetap terbaca.

---

## 5d. 🔒 Pembelian Selalu Didanai Saldo Utama; Saldo Toko Dipindahkan Dulu (Amandemen 2026-09-09)

**Ini menarik kembali kemampuan yang ditambahkan Bagian 5c**, atas keputusan eksplisit dan sadar pemilik produk pada 2026-09-09, setelah diskusi desain yang mempertimbangkan alternatifnya lebih dulu. Aturan barunya:

> Sebuah pembelian PPOB **selalu** didanai dompet pribadi/operasional penelepon. Saldo toko sampai ke pembelian hanya lewat satu jalan: pemiliknya **memindahkannya dulu** ke saldo utamanya sendiri ("Pindahkan ke Saldo Utama").

**Alasannya pembukuan, bukan keamanan.** Buku toko harus terbaca sebagai buku warung. Ketika saldo toko mendanai pembelian secara langsung, ledger toko ikut terisi baris `RESERVE`/`DEBIT`/`RELEASE`, percobaan gagal, dan keriuhan SKU cadangan — yang akan membuat pembukuannya tidak terbaca begitu kasirnya tumbuh punya refund, shift, bayar karyawan, dan kulakan dari supplier. Memindahkan secara eksplisit juga membuat kalimat PRD sendiri — *"jualan sembako Anda otomatis jadi modal jualan pulsa"* — menjadi **satu baris ledger yang benar-benar ada**, bukan kiasan.

**Yang berubah:**
1. `src/app/api/transactions/execute/route.ts` — field `payWith` dihapus. Dompet kembali diresolusi tunggal lewat `getWalletForMitraSession`, persis seperti sebelum Bagian 5c. `getSpendableStoreWalletForOwner` ikut dihapus karena tidak lagi punya pemanggil.
2. Mesin transaksinya sendiri **tetap tidak pernah disentuh**, sama seperti pada 5c.
3. Jalur baru: `settleStoreBalance` (`src/services/store.service.ts`) + `POST /api/stores/settle`, memakai dua jenis ledger baru `STORE_SETTLEMENT_OUT`/`STORE_SETTLEMENT_IN` (migrasi `050_store_settlement.sql`) dan tabel `store_settlements` ber-`idempotency_key UNIQUE`.

**Jaminan yang dipegang:**
1. **Ini bukan pencairan dan bukan transfer.** Kedua dompet milik orang yang sama, dan keduanya diresolusi di server dari sesi — klien tidak pernah menyebut dompet mana pun.
2. **Aturan #9 PRD Toko tetap utuh**: dompet toko tetap tidak pernah bisa mengirim saldo ke **pengguna lain**. `transferToDownline` tetap hanya memakai `getWalletForMitraSession`, yang menurut kontraknya tidak pernah mengembalikan dompet `STORE`.
3. **Jenis ledgernya sengaja terpisah dari `TRANSFER_*`**, supaya "pindah ke dompet sendiri" tidak pernah tertukar dengan "kirim ke orang lain" di laporan maupun saat diaudit.
4. **Idempoten**: baris `store_settlements` diklaim lebih dulu lewat `ON CONFLICT DO NOTHING` sebelum kaki ledger mana pun diposting — pola yang sama persis dengan `createWalletTransfer` dan `createTransaction` (lihat Bagian 5b soal kenapa polanya harus begitu, bukan try/catch).
5. **Komisi — dua hal berbeda yang mudah tertukar, diputuskan eksplisit oleh pemilik produk:**
   - **Pelanggan membayar di warung** (beli rokok, sembako) **tidak memberi komisi kepada siapa pun**. Ini terjamin secara struktur, bukan lewat pengecualian yang bisa lupa dipasang: mesin komisi hanya dipicu dari `transaction.service.ts` untuk transaksi PPOB, dan `confirmStorePayment` tidak pernah menyentuhnya.
   - **Pemilik toko membeli pulsa/token** dengan saldo yang sudah dipindahkan **tetap memberi komisi kepada upline-nya**, seperti pembelian biasa. Tidak ada pengecualian yang diinginkan di sini. Ini juga memperbaiki keanehan sebelumnya: "pembelian toko tanpa komisi" pada Bagian 5c sebenarnya tidak pernah merupakan keputusan produk — ia jatuh begitu saja dari skema (`getOwningUserId` mengembalikan `null` untuk dompet `STORE`).

**Catatan penting soal riwayat**: transaksi DANA Rp1.700 pada 2026-09-08 didanai dompet toko selagi Bagian 5c masih berlaku. Karena itu `listReadableWalletIds` (`wallet.service.ts`) **tetap dipertahankan** meski dompet toko tidak akan pernah lagi menjadi sumber transaksi baru — tanpa itu, transaksi nyata tersebut akan hilang lagi dari Histori pemiliknya.

**Verifikasi — SELESAI, diuji lewat HTTP nyata di database dev:**
- [x] Pemindahan Rp5.000 berhasil: dompet toko 12.000 → 7.000, saldo utama 0 → 5.000.
- [x] **Idempotensi**: permintaan kedua dengan `idempotencyKey` yang sama mengembalikan `settlementId` yang sama persis, saldo **tidak** berpindah dua kali, dan tabel `store_settlements` tetap berisi **satu** baris.
- [x] **Ledger benar**: tepat dua kaki — `STORE_SETTLEMENT_OUT` (12.000 → 7.000) dan `STORE_SETTLEMENT_IN` (0 → 5.000) — keduanya tertaut ke `settlement_id` yang sama.
- [x] **Penjaga nominal**: percobaan memindahkan melebihi saldo toko ditolak (`"Saldo toko tidak cukup untuk pemindahan ini."`) tanpa mengubah apa pun.
- [x] Kode lulus `tsc --noEmit`, `npm run build`, dan `flutter analyze`.

---

## 6. Yang Aman Disentuh (murni presentasi, bukan logika)

- Ikon, warna, teks/copy pada layar hasil (SUCCESS/FAILED/PENDING) — selama tidak mengubah kapan status itu ditampilkan.
- Menambahkan field tampilan baru (mis. breakdown baru dari `sn`) selama parsing dilakukan di layer tampilan (`parsePlnToken`), bukan mengubah apa yang disimpan di `transactions.provider_transaction_id`.
- Menambahkan kategori PPOB baru ke `categoryConfigs`/halaman kategori baru — otomatis mewarisi seluruh flow ini tanpa perlu menulis ulang logika submit/polling/webhook.

---

## 7. Isu yang Sudah Diketahui, Sengaja Belum Diperbaiki (dicatat, bukan diabaikan)

- **Job reconciliation tidak punya batas umur transaksi.** Dokumentasi resmi Digiflazz: cek status transaksi yang sudah lewat 90 hari berisiko dianggap pembelian baru. `listByStatus("RESERVED", ...)` saat ini tidak memfilter umur — risiko laten kalau ada transaksi macet lebih dari 90 hari. Belum ada mitigasi.
- **Tidak ada throttle eksplisit pada batch 50 transaksi per siklus job** — berisiko kena rc 85 (rate limit) kalau backlog RESERVED membesar drastis. Belum jadi masalah nyata (volume saat ini rendah).
- **Webhook untuk event "Cek Nama" (verifikasi nama, bukan pembelian) selalu dijawab 404** karena SKU cek-nama tidak pernah punya baris `transactions` (ref_id sengaja ephemeral). Ini harmless by design, dibiarkan atas persetujuan eksplisit pemilik produk.
- **Endpoint resmi `POST /v1/inquiry-pln`** (validasi ID PLN gratis, terstruktur) belum diimplementasikan — fitur "Cek Nama Token PLN" saat ini masih memakai SKU berbayar lewat `/v1/transaction`. Dianalisis, belum dieksekusi.

---

## 8. Acuan untuk Layanan/Integrasi Baru

Kalau ke depan dibangun kategori PPOB baru, atau integrasi provider selain Digiflazz:

1. **Jangan buat state machine transaksi baru.** Pakai ulang `transactions` + `transaction_events` + `applyDigiflazzResult`-style single funnel (satu fungsi yang menerima hasil dari jalur sinkron maupun webhook).
2. **Kalau provider baru punya webhook**: wajib verifikasi signature sebelum memproses apa pun (lihat Bagian 5.1), dan wajib menangani payload "ping/test" provider secara eksplisit (lihat riwayat bug ping Digiflazz — payload tanpa bentuk transaksi normal harus dijawab 2xx, bukan dianggap error).
3. **Kalau provider punya status "Pending" async**: pakai pola bounded-polling yang sama (interval wajar, batas percobaan jelas, berhenti total begitu unmount/timeout) — jangan `setInterval` tanpa batas.
4. **Parsing nilai uang dari Postgres**: SELALU pakai `parseMoneyInt`/`num.parse` di Flutter (bukan `int.parse` langsung) — `NUMERIC` dengan scale desimal (mis. markup) akan membuat `int.parse` gagal. Ini bug nyata yang sudah terjadi dan diperbaiki untuk PLN & Pulsa.

---

## 9. Peta File Terkait

**Backend (`digides`):**
- `src/services/transaction.service.ts` — `executeTransaction`, `checkTransactionStatus`, `settleWithProvider`, `applyDigiflazzResult`, `processDigiflazzWebhookEvent`, `captureTransaction`, `releaseTransaction`, `trySwapToBackupSku` (Bagian 5a)
- `src/lib/digiflazz/transaction.ts`, `src/lib/digiflazz/webhook.ts`
- `src/jobs/pending-transaction-check.ts`, `instrumentation.ts`
- `src/app/api/webhooks/digiflazz/route.ts`, `src/app/api/transactions/[id]/route.ts`, `src/app/api/transactions/[id]/check-status/route.ts`
- `src/lib/formatting/pln-token.ts` (`parsePlnToken`)
- `src/features/mitra-purchase/components/purchase-result-screen.tsx`
- `src/features/mitra-histori/components/histori-detail-view.tsx`
- **Bagian 5a (SKU cadangan otomatis)**: `src/repositories/product.repository.ts` (`findBackupProductCandidates`), `src/repositories/transaction.repository.ts` (`lockTransactionForUpdate`, `swapTransactionProductForBackup`), `src/services/commission.service.ts` (`awardCommissionForTransaction`'s profit cap), `src/features/transaction/components/transaction-detail.tsx` (catatan pergantian SKU di Super Admin), migrasi `041_transaction_backup_sku.sql`
- **Bagian 5b (perbaikan idempotency)**: `src/repositories/transaction.repository.ts` (`createTransaction`)
- **Bagian 5d (pemindahan saldo toko)**: `src/services/store.service.ts` (`settleStoreBalance`), `src/app/api/stores/settle/route.ts`, `src/repositories/store.repository.ts` (`createStoreSettlement`), migrasi `050_store_settlement.sql`. Bagian 5c (`payWith`) sudah ditarik — tidak ada berkas yang tersisa untuknya.

**Flutter (`digides_mitra`):**
- `lib/features/purchase/purchase_screen.dart` — `_submitPurchase`, `_startPolling`, `_pollOnce`
- `lib/features/purchase/purchase_pin_screen.dart` — overlay "Sedang Diproses"
- `lib/features/purchase/purchase_result_screen.dart` — spinner Pending vs ikon diam
- `lib/features/histori/transaction_detail_screen.dart`
- `lib/core/format.dart` — `parseMoneyInt`, `parsePlnToken`
- `lib/models/product.dart`, `transaction.dart`, `wallet.dart`, `wallet_ledger_entry.dart`, `recap_summary.dart`

**Dashboard Digiflazz (eksternal, bukan kode):** Pengaturan Koneksi API → Webhook → Payload URL harus `https://digidespay.pro/api/webhooks/digiflazz`, status Aktif.
