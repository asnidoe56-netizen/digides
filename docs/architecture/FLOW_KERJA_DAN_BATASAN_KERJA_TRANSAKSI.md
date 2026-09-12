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
>
> Bagian 5e adalah amandemen sadar atas aturan #3 dan #7, diinstruksikan eksplisit oleh pemilik produk pada 2026-09-11: **jeda minimal 60 detik** sebelum `ref_id` yang sama dikirim lagi ke Digiflazz, dan **batas umur** cek status (job berhenti setelah 7 hari, semua jalur menolak di atas 85 hari). Keduanya berasal dari dokumentasi Cek Status resmi Digiflazz; aturan jeda terbukti sudah dilanggar 7 kali di produksi tanpa kerugian (lihat buktinya di Bagian 5e).
>
> Bagian 5f adalah amandemen sadar untuk **pembayaran tagihan (pascabayar)**, diinstruksikan eksplisit oleh pemilik produk pada 2026-09-12 (*"silakan amandemen dan kerjakan agar di Flutter benar-benar bekerja"*). Ia menambahkan satu jalur kedua ke Digiflazz — cek tagihan lalu bayar dengan `ref_id` yang sama — tanpa membuat state machine baru dan tanpa menyentuh jalur prabayar. Rancangan lengkapnya ada di `docs/product/PRD_PASCABAYAR.md`.

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

**Catatan Bagian 5e (2026-09-11)**, berlaku di atas aturan #3 dan #7: "kirim ulang dengan `ref_id` sama = cek status" hanya boleh terjadi kalau kontak terakhir dengan Digiflazz untuk transaksi itu sudah lewat **60 detik** dan umur transaksinya di bawah **85 hari**. Job reconciliation tetap berinterval 3 menit, tetapi hanya mengambil transaksi yang lolos jeda itu dan berumur di bawah 7 hari. Lihat Bagian 5e.

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

## 5e. 🔒 Jeda Minimal dan Batas Umur Cek Status ke Digiflazz (Amandemen 2026-09-11)

**Latar belakang**: halaman Cek Status di dokumentasi resmi Digiflazz memuat dua aturan yang sebelumnya tidak dijaga kode sama sekali:

> *"Untuk menjaga konsistensi proses, kami menyarankan agar pemanggilan API untuk transaksi/data yang sama tidak dilakukan berulang dalam interval kurang dari 1 (satu) menit. Pemanggilan berulang dalam rentang waktu tersebut dapat menimbulkan race condition atau duplikasi proses. Segala risiko yang timbul dari kondisi tersebut berada di luar tanggung jawab kami."*

> *Prepaid: "Jangan pernah mencoba untuk melakukan Cek Status terhadap transaksi yang sudah lewat 90 HARI karena hal tersebut akan menyebabkan pembuatan transaksi BARU."*

**Aturan pertama sudah dilanggar di produksi.** Audit baca-saja pada 2026-09-11 atas 53 transaksi pertama (2–11 September), dicocokkan dengan log nginx:
- **7 transaksi** menerima panggilan ulang `ref_id` yang sama kurang dari 60 detik setelah panggilan sebelumnya.
- **6 oleh job reconciliation**, 3–50 detik setelah submit pertama. Penyebabnya: `listByStatus("RESERVED")` mengambil semua transaksi RESERVED tanpa melihat kapan terakhir dihubungi. Pada detik-detik itu tidak ada permintaan HTTP apa pun di log nginx, jadi panggilannya bukan dari klien atau webhook.
- **1 oleh tombol "Cek Status" Super Admin**: 5 klik dalam 89 detik, 4 di antaranya dalam 11 detik (transaksi 2026-09-03 01:10).
- **Tanpa kerugian**: di setiap jawaban ulang, `buyer_last_saldo` deposit tidak berubah, dan ledger tiap transaksi tepat satu RESERVE + satu DEBIT/RELEASE. Digiflazz memperlakukannya sebagai cek status — tapi secara tertulis mereka tidak menanggung kalau suatu saat tidak.

**Aturan kedua belum pernah terpicu** (transaksi tertua 2026-09-02, jadi paling cepat bisa terjadi 2026-12-01), tapi sudah tercatat sebagai isu laten di Bagian 7 sejak dokumen ini dibuat.

Diinstruksikan eksplisit oleh pemilik produk pada 2026-09-11.

**Cara kerja**:

1. **"Kontak terakhir" dihitung dari data yang sudah ada** — `getProviderContactTiming` (`src/repositories/transaction.repository.ts`): yang paling baru dari `transactions.created_at` dan `transaction_events.created_at` terbaru. Tidak ada kolom baru dan tidak ada migrasi: baris RESERVE + event pertamanya ditulis tepat sebelum submit pertama, dan setiap jawaban Pending maupun gagal koneksi sesudahnya juga menulis event. Detik dihitung dengan `now()` milik basis data.
2. **Satu titik keputusan** — `evaluateProviderRecheck` (`src/services/transaction.service.ts`), dipakai setiap jalur yang bisa mengirim `ref_id` yang **sudah pernah** dikirim kembali ke Digiflazz:
   - `checkTransactionStatus` (tombol admin dan job): menolak dengan pesan *"Transaksi ini baru saja diperiksa ke Digiflazz. Coba lagi dalam N detik."* atau *"Transaksi ini sudah berumur lebih dari 85 hari…"*. Tombol Cek Status menampilkan pesan itu apa adanya.
   - `executeTransaction` yang diulang dengan `idempotency_key` sama selagi transaksinya masih RESERVED: mengembalikan baris RESERVED tanpa memanggil Digiflazz. Web dan Flutter sudah memperlakukan RESERVED sebagai "diproses" lalu polling, dan job mengambilnya begitu satu menit lewat.
   - **Tidak** berlaku untuk submit pertama, dan tidak untuk percobaan SKU cadangan (Bagian 5a) — keduanya membawa `ref_id` baru.
3. **Konstanta**: `PROVIDER_RECHECK_COOLDOWN_SECONDS = 60`; `MAX_STATUS_CHECK_AGE_DAYS = 85` (jarak 5 hari dari batas 90 untuk selisih zona waktu dan jam); `AUTO_STATUS_CHECK_MAX_AGE_DAYS = 7`.
4. **Job** — `listReservedDueForStatusCheck` menggantikan `listByStatus`: hanya transaksi RESERVED yang kontak terakhirnya sudah ≥ 60 detik **dan** umurnya < 7 hari, tertua lebih dulu. Interval 3 menit (aturan #7) dan batch 50 tidak berubah. Transaksi yang lewat 7 hari tetap tampil di Transaksi Tertahan dan tetap bisa dicek lewat tombol sampai 85 hari; teks halaman itu kini menyebutkannya.
5. **Yang sengaja tidak berubah**: funnel tunggal `applyDigiflazzResult`, compare-and-swap status, ledger RESERVE/DEBIT/RELEASE, verifikasi webhook, polling klien 3 detik × 20 (klien bertanya ke server Digides, bukan ke Digiflazz), SKU cadangan (5a), idempotency (5b).

**Risiko yang diketahui, disengaja belum ditutup** (gaya yang sama seperti Bagian 7):
- `submitDigiflazzTransaction` memakai `fetch` tanpa batas waktu. Kalau satu panggilan menggantung lebih dari 60 detik tanpa jawaban, belum ada event baru yang tertulis, sehingga job berikutnya bisa mengirim ulang `ref_id` yang sama selagi panggilan pertama masih terbuka. Belum pernah teramati — jawaban sinkron pada audit di atas 0,1–1,2 detik.
- Kalau webhook atau klik admin masuk di antara query job dan `checkTransactionStatus`, panggilan job itu ditolak pagar, tercatat sebagai `errors` pada run tersebut, lalu dicek normal pada run berikutnya.
- Transaksi RESERVED yang lewat 85 hari tidak punya jalur penyelesaian di aplikasi — harus diselesaikan manual dengan mencocokkan dashboard Digiflazz. Jumlahnya hari ini 0.
- Jalur `executeTransaction` yang diulang tidak diuji otomatis (butuh PIN dan harga live Digiflazz); diverifikasi lewat pembacaan kode karena memakai `evaluateProviderRecheck` yang sama dengan jalur yang diuji.

**Verifikasi:**

*Lokal — database dev, tanpa satu pun panggilan ke Digiflazz, 17/17 lulus:*
- [x] Job hanya memilih transaksi yang kontak terakhirnya 5 menit lalu, dan melewati: yang baru disubmit, yang dijawab Pending 20 detik lalu walau umurnya 10 menit, yang berumur 8 hari, dan yang berumur 86 hari.
- [x] Perhitungan waktu tepat (20,0 detik; 300,0 / 600,0 detik), termasuk transaksi yang belum punya event sama sekali.
- [x] `checkTransactionStatus` menolak transaksi yang baru disubmit ("Coba lagi dalam 60 detik") dan yang dijawab 20 detik lalu ("40 detik") — tanpa menulis event dan tanpa mengubah status, bukti tidak ada panggilan ke Digiflazz.
- [x] Menolak transaksi berumur 86 hari; batas umur didahulukan dari jeda (transaksi 86 hari yang baru diklik 10 detik lalu tetap mendapat pesan 85 hari).
- [x] `tsc --noEmit` lulus (exit 0). Proyek ini tidak memakai eslint — tidak ada skrip `lint` maupun berkas konfigurasinya.

*Produksi:*
- [ ] Setelah deploy: kueri audit yang sama atas `transaction_events` tidak lagi menemukan pasangan jawaban `ref_id` sama berjarak < 60 detik untuk transaksi baru.

---

## 5f. 🔒 Pembayaran Tagihan Pascabayar (Amandemen 2026-09-12)

**Latar belakang**: sampai hari ini seluruh mesin ini hanya mengenal produk yang harganya sudah diketahui sebelum dibeli. Tagihan tidak begitu — nominalnya baru ada setelah ditanyakan ke Digiflazz, dan pembayarannya wajib memakai `ref_id` yang sama dengan pertanyaan itu, di tanggal yang sama. Diinstruksikan eksplisit oleh pemilik produk pada 2026-09-12. Rancangan dan alasan tiap keputusan ada di `docs/product/PRD_PASCABAYAR.md`; bagian ini hanya menetapkan batasannya.

**Alur dua langkah:**

```
1. CEK TAGIHAN  inq-pasca(ref_id baru)  → bill_inquiries tersimpan
                                          TIDAK ada transaksi, TIDAK ada RESERVE
2. BAYAR        PIN → transactions(idempotency_key = ref_id) + RESERVE
                pay-pasca(ref_id SAMA) → applyDigiflazzResult() yang sama
3. PENDING      status-pasca(ref_id SAMA), lewat pagar §5e
```

**Yang berubah dari aturan sebelumnya:**

1. **Aturan #2 (pengiriman ke Digiflazz)** — ditambah jalur kedua yang sejajar: `src/lib/digiflazz/postpaid.ts` dengan `commands` `inq-pasca` / `pay-pasca` / `status-pasca`. Formula signature tetap `md5(username + apiKey + ref_id)`, dan flag `testing` tetap hanya untuk mode development. `submitDigiflazzTransaction` (prabayar) **tidak disentuh sama sekali** — jalur pascabayar berdiri di sebelahnya, bukan menjadi cabang di dalamnya.
2. **Aturan #3 (idempotency)** — untuk `POSTPAID`, `ref_id` lahir di `bill_inquiries` saat cek tagihan, bukan dari klien. Saat membayar, server memakai `bill_inquiries.ref_id` sebagai `transactions.idempotency_key`; `idempotencyKey` kiriman klien diabaikan. Tetap satu `ref_id` per niat bayar, dan tetap tidak pernah dibuat ulang. Pagar keduanya: `transactions.bill_inquiry_id` UNIQUE — satu hasil cek tagihan paling banyak menghasilkan satu transaksi.
3. **Aturan #3 ("kirim ulang dengan ref_id sama = cek status")** — **tidak berlaku untuk `pay-pasca`.** Mengirim ulang perintah bayar bukan cek status, dan berisiko membayar tagihan dua kali. Cek status memakai perintah tersendiri `status-pasca`. `payPostpaidBill` hanya boleh punya satu pemanggil: pembayaran pertama.
4. **Aturan #8 dan Bagian 5a (SKU cadangan)** — **tidak berlaku untuk `POSTPAID`.** `trySwapToBackupSku` mengembalikan "tidak ada cadangan" untuk tagihan: `ref_id` itu satu-satunya tautan ke hasil cek tagihan di sisi Digiflazz, seller lain tidak mengenalnya, dan nilai tagihannya belum tentu sama. Ganti SKU = cek tagihan baru = persetujuan mitra yang baru. Penjaga kedua sudah ada di SQL sejak migrasi 057 (`findBackupProductCandidates` menyaring `product_type = 'PREPAID'`).
5. **`executeTransaction` menolak `POSTPAID` secara eksplisit.** Sebelum amandemen ini, permintaan buatan dengan id produk pascabayar ditolak hanya sebagai efek samping — pengecekan harga prabayar tidak menemukan SKU-nya, lalu produknya ikut ditandai nonaktif. Aman secara uang, tapi tidak pantas disebut penjaga. Sekarang jalur pembelian prabayar menolaknya di awal dengan pesan yang jelas.
6. **Capture untuk `POSTPAID`** — kalau `price` pada jawaban `pay-pasca` lebih besar daripada `bill_inquiries.provider_price`, `transactions.base_price` diperbarui ke angka yang **sebenarnya dipotong** sebelum komisi dan cashback dihitung, dan selisihnya dicatat sebagai `transaction_events` (`POSTPAID_PRICE_MISMATCH`). Alasannya: `pay-pasca` tidak punya `max_price`, jadi tidak ada pagar di sisi Digiflazz. Mitra tetap membayar angka yang ia setujui; selisihnya menggerus margin Digides, dan kejadian itu harus terlihat, bukan tersembunyi.
7. **"Data belum ada" tidak pernah melepas saldo.** Digiflazz menjawab begitu untuk cek status pascabayar yang lewat 90 hari — tapi jawaban yang sama sangat mungkin juga muncul kalau `pay-pasca` kita tidak pernah sampai ke mereka, dan dari sisi Digides kedua keadaan itu tidak bisa dibedakan. Kalau dianggap Gagal lalu saldo dilepas padahal tagihannya terbayar, Digides membayar tagihan orang dengan uangnya sendiri. Jadi transaksinya tetap RESERVED, jawabannya dicatat, dan ditandai untuk ditangani manual di Transaksi Tertahan.
8. **Pesan penolakan 85 hari (§5e) dibedakan untuk `POSTPAID`** — untuk tagihan, cek status di atas 90 hari hanya dijawab "Data belum ada", bukan membuat pembelian baru seperti prabayar.

**Yang sengaja TIDAK berubah:**

- **Funnel tunggal.** Jawaban `pay-pasca` maupun `status-pasca` masuk ke `applyDigiflazzResult` yang sama persis dengan prabayar. Tidak ada jalur kedua untuk capture/release (aturan #4 dan #5 utuh).
- **Tidak ada state machine baru** — `transactions` + `transaction_events` + compare-and-swap yang sama (Bagian 8.1).
- Reservasi/pelepasan saldo lewat `postLedgerEntry` di dalam `withTransaction`, verifikasi signature webhook, polling klien 3 detik × 20, interval job 3 menit, pagar jeda 60 detik dan batas umur (§5e), pendanaan dari saldo utama (§5d), idempotency `ON CONFLICT` (§5b).
- **Tidak ada tipe ledger baru.** Tagihan memakai RESERVE / DEBIT / RELEASE yang sudah ada, jadi 17 titik klasifikasi ledger tidak tersentuh.

**Batasan tambahan khusus tagihan:**

1. **Harga dikunci saat cek tagihan.** Yang di-RESERVE adalah `bill_inquiries.total_amount`, angka yang persis tampil di layar mitra. Tidak ada penghitungan ulang harga saat PIN ditekan.
2. **Masa berlaku**: yang lebih dulu antara akhir tanggal yang sama (aturan Digiflazz) dan 30 menit setelah cek tagihan (keputusan Digides). Sesudah itu wajib cek ulang, dengan `ref_id` baru.
3. **`bill_inquiries` append-only**, seperti tabel keuangan lain: ia bukti apa yang dilihat mitra sebelum membayar.
4. **`buyer_sku_code` dan `customer_no` dipakai ulang dari `bill_inquiries`**, bukan dibaca ulang dari katalog atau input, supaya `status-pasca` selalu memakai kode yang sama dengan `pay-pasca`.

**Verifikasi — sudah terbukti (uji lokal 2026-09-12, tanpa satu pun panggilan Digiflazz, 15/15 lulus):**
- [x] Cek tagihan kedaluwarsa, milik mitra lain, atau yang gagal: ditolak **sebelum** PIN diminta, jadi tidak pernah sampai ke RESERVE.
- [x] Satu hasil cek tagihan tidak bisa menghasilkan dua transaksi — ditolak database (`transactions_bill_inquiry_id_key`), bukan hanya oleh kode.
- [x] Hasil cek tagihan berstatus SUKSES tanpa nominal ditolak database (`bill_inquiries_sukses_wajib_berangka`): tidak akan ada RESERVE tanpa dasar angka.
- [x] Baris hasil cek tagihan tidak bisa diubah maupun dihapus (trigger append-only).
- [x] Masa berlaku benar, termasuk kasus jelang tengah malam: tidak pernah melewati akhir hari WIB.
- [x] Nomor pelanggan berkoma ditolak; PBB/SAMSAT wajib dua bagian lengkap.
- [x] Cek ulang produk + nomor yang sama dalam 60 detik memakai hasil sebelumnya, tanpa memanggil Digiflazz lagi.
- [x] Migrasi 057 & 058 terpasang di produksi dan skemanya diperiksa langsung; katalog prabayar tidak berubah (12 kategori, 204 produk aktif).
- [x] Keempat endpoint pascabayar hidup di produksi (403 tanpa sesi, bukan 404).
- [x] `executeTransaction` menolak produk `POSTPAID` — **diverifikasi lewat pembacaan kode**, bukan uji otomatis: jalur itu memverifikasi PIN lebih dulu, dan uji otomatisnya butuh PIN mitra yang sah.

**Verifikasi — menunggu pengujian di mode development Digiflazz** (pemilik produk memilih jalur itu, supaya tidak ada tagihan sungguhan yang terbayar saat menguji):
- [ ] Cek tagihan sungguhan tidak menulis satu baris pun di `transactions` maupun `wallet_ledger`.
- [ ] Sukses: saldo berkurang tepat `total_amount`, sekali; satu RESERVE dan satu DEBIT.
- [ ] Gagal: saldo kembali utuh; tidak ada percobaan SKU cadangan.
- [ ] Pending lalu Sukses lewat `status-pasca`, dengan pagar jeda 60 detik terbukti menahan.
- [ ] "Data belum ada" tidak melepas saldo.
- [ ] Arti `price` vs `selling_price` terkonfirmasi dari jawaban sungguhan (PRD Pascabayar Bagian 1).
- [ ] `verifyLedgerConsistency` bersih setelah semua skenario di atas.
- [ ] Terlihat benar di aplikasi Flutter: rincian tagihan, layar hasil, dan nomor referensi.

---

## 6. Yang Aman Disentuh (murni presentasi, bukan logika)

- Ikon, warna, teks/copy pada layar hasil (SUCCESS/FAILED/PENDING) — selama tidak mengubah kapan status itu ditampilkan.
- Menambahkan field tampilan baru (mis. breakdown baru dari `sn`) selama parsing dilakukan di layer tampilan (`parsePlnToken`), bukan mengubah apa yang disimpan di `transactions.provider_transaction_id`.
- Menambahkan kategori PPOB baru ke `categoryConfigs`/halaman kategori baru — otomatis mewarisi seluruh flow ini tanpa perlu menulis ulang logika submit/polling/webhook.

---

## 7. Isu yang Sudah Diketahui, Sengaja Belum Diperbaiki (dicatat, bukan diabaikan)

- ~~**Job reconciliation tidak punya batas umur transaksi.**~~ **Ditutup oleh Bagian 5e (2026-09-11).** Job kini hanya mengecek transaksi berumur di bawah 7 hari, dan semua jalur menolak cek status di atas 85 hari. Amandemen yang sama juga menutup masalah yang tidak pernah tercatat di sini: job dan tombol admin mengirim ulang `ref_id` yang sama kurang dari 60 detik (7 kali di produksi, tanpa kerugian).
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
- **Bagian 5e (jeda & batas umur cek status)**: `src/services/transaction.service.ts` (`evaluateProviderRecheck`, `PROVIDER_RECHECK_COOLDOWN_SECONDS`, `AUTO_STATUS_CHECK_MAX_AGE_DAYS`), `src/repositories/transaction.repository.ts` (`getProviderContactTiming`, `listReservedDueForStatusCheck` — menggantikan `listByStatus`), `src/jobs/pending-transaction-check.ts`, `src/app/dashboard/super-admin/transaksi-tertahan/page.tsx` (teks batas 7 hari). Tanpa migrasi.

**Flutter (`digides_mitra`):**
- `lib/features/purchase/purchase_screen.dart` — `_submitPurchase`, `_startPolling`, `_pollOnce`
- `lib/features/purchase/purchase_pin_screen.dart` — overlay "Sedang Diproses"
- `lib/features/purchase/purchase_result_screen.dart` — spinner Pending vs ikon diam
- `lib/features/histori/transaction_detail_screen.dart`
- `lib/core/format.dart` — `parseMoneyInt`, `parsePlnToken`
- `lib/models/product.dart`, `transaction.dart`, `wallet.dart`, `wallet_ledger_entry.dart`, `recap_summary.dart`

**Dashboard Digiflazz (eksternal, bukan kode):** Pengaturan Koneksi API → Webhook → Payload URL harus `https://digidespay.pro/api/webhooks/digiflazz`, status Aktif.
