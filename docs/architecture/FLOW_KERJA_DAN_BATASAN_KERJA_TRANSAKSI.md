# Flow Kerja dan Batasan Kerja Transaksi

> **STATUS: ⏳ AMANDEMEN MENUNGGU VERIFIKASI (sejak 2026-09-07).** Dokumen ini menetapkan alur kerja transaksi PPOB (pembelian ke Digiflazz) yang sudah diverifikasi bekerja benar di produksi per 2026-09-03. Bagian yang ditandai 🔒 di bawah **tidak boleh diubah** pada sesi kerja berikutnya tanpa instruksi eksplisit dan sadar dari pemilik produk — bukan sekadar "sedang memperbaiki bug lain di dekatnya". Dokumen ini juga menjadi **acuan pola** untuk layanan/kategori pembayaran baru yang akan dibangun di atas fondasi yang sama.
>
> Bagian 5a (mekanisme SKU cadangan otomatis) adalah amandemen sadar atas aturan #3/#8 versi sebelumnya, diinstruksikan eksplisit oleh pemilik produk pada 2026-09-07. Status di atas kembali menjadi **🔒 DIKUNCI** hanya setelah amandemen ini lolos uji nyata di produksi (lihat catatan verifikasi di akhir Bagian 5a) — sebelum itu, anggap Bagian 5a sebagai kode yang sudah ditulis tapi BELUM terverifikasi seperti bagian lain dokumen ini.

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
3. **Idempotency** — `ref_id` yang dikirim ke Digiflazz SELALU `transactions.idempotency_key`, tidak pernah dibuat ulang untuk transaksi yang sama. Re-submit dengan `ref_id` sama = cek status, bukan pembelian baru. **Pengecualian tunggal, disengaja (lihat Bagian 5a)**: mekanisme SKU-cadangan-otomatis BOLEH membuat ulang `idempotency_key` pada baris `transactions` yang SAMA (id sama), tapi hanya lewat `swapTransactionProductForBackup` (`src/repositories/transaction.repository.ts`), dipanggil hanya dari `trySwapToBackupSku` (`src/services/transaction.service.ts`), dan tidak pernah untuk alasan lain apa pun.
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

**Verifikasi (isi setelah pengujian nyata selesai — lihat catatan STATUS di awal dokumen)**:
- [ ] Diuji dengan transaksi nyata di produksi yang benar-benar mengalami SKU asli gagal dan berhasil pindah ke SKU cadangan.
- [ ] Dikonfirmasi harga jual ke pembeli tidak berubah, dan komisi (kalau ada) sesuai batas profit riil.
- [ ] Dikonfirmasi tampilan Flutter/web tidak menunjukkan kejanggalan apa pun (tidak ada transaksi ganda, tidak ada pesan gagal yang sempat terlihat).

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

**Flutter (`digides_mitra`):**
- `lib/features/purchase/purchase_screen.dart` — `_submitPurchase`, `_startPolling`, `_pollOnce`
- `lib/features/purchase/purchase_pin_screen.dart` — overlay "Sedang Diproses"
- `lib/features/purchase/purchase_result_screen.dart` — spinner Pending vs ikon diam
- `lib/features/histori/transaction_detail_screen.dart`
- `lib/core/format.dart` — `parseMoneyInt`, `parsePlnToken`
- `lib/models/product.dart`, `transaction.dart`, `wallet.dart`, `wallet_ledger_entry.dart`, `recap_summary.dart`

**Dashboard Digiflazz (eksternal, bukan kode):** Pengaturan Koneksi API → Webhook → Payload URL harus `https://digidespay.pro/api/webhooks/digiflazz`, status Aktif.
