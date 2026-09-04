# Rencana: Notifikasi Mitra (Transaksi & Top Up)

> **STATUS: 📋 RENCANA — BELUM DIKERJAKAN.** Dokumen ini mencatat hasil audit dan rencana yang sudah disepakati arahnya (2026-09-04), untuk dikerjakan di sesi berikutnya. Jangan mulai implementasi hanya karena membaca dokumen ini — tunggu instruksi eksplisit untuk mengerjakannya.

---

## 1. Temuan Audit — Kondisi Saat Ini

**Yang sudah ada dan benar:**
- Pusat notifikasi dalam-aplikasi sudah lengkap: ikon lonceng + badge unread (`NotificationBell`, Flutter), panel daftar, tandai dibaca/semua dibaca — di Web maupun Flutter, lewat endpoint yang sama (`/api/notifications`, `/api/notifications/unread-count`, `.../read`, `.../read-all`).
- Skema tabel `notifications` sudah ada: `id, recipient_role, type, title, body, entity, entity_id, is_read, created_at`.

**Gap yang ditemukan:**
- `notification.service.ts` hanya punya **satu** fungsi pembuat notifikasi: `notifySuperAdmin()`, hardcode `recipient_role: "SUPER_ADMIN"`. Komentar di kode itu sendiri mengonfirmasi: *"even though only notifySuperAdmin() actually produces any today"*.
- Akibatnya: lonceng notifikasi di aplikasi mitra (KONTER/BUMDES_ADMIN/AFFILIATE) **selalu kosong** — tidak ada satu pun kode yang pernah membuat notifikasi untuk role tersebut.
- `recipient_role` bersifat **broadcast per-role**, bukan per-pengguna — tidak cocok untuk notifikasi personal ("transaksi Anda", bukan "transaksi semua konter").
- Verifikasi langsung ke `processMidtransNotification()` (`wallet-topup.service.ts`): jalur `isSuccess` (top up berhasil, saldo bertambah) **sama sekali tidak memanggil notifikasi apa pun** — hanya jalur gagal yang memanggil `notifySuperAdmin`.
- Tidak ada infrastruktur push notification sama sekali: tidak ada Firebase/FCM, tidak ada `flutter_local_notifications`, tidak ada izin `POST_NOTIFICATIONS` di `AndroidManifest.xml`. Notifikasi tidak bisa muncul di luar aplikasi (layar kunci/status bar) — itu proyek terpisah yang jauh lebih besar, lihat Bagian 5.

---

## 2. Keputusan yang Sudah Disepakati

- **Tahap ini: isi sistem yang sudah ada dulu** (in-app, bukan push/native). Push notification (FCM) sengaja **ditunda** ke fase terpisah nanti — lihat Bagian 5.
- **Mekanisme pembaruan lonceng: bounded polling**, bukan saluran realtime baru (WebSocket/SSE). Alasan: kita sudah pernah menghadapi pilihan yang sama untuk status transaksi (jauh lebih mendesak) dan sengaja memilih bounded polling karena Nginx belum dikonfigurasi untuk WebSocket dan tidak ada infrastruktur realtime lain di proyek ini (`FLOW_KERJA_DAN_BATASAN_KERJA_TRANSAKSI.md`). Notifikasi lonceng jauh lebih longgar toleransi waktunya dibanding layar transaksi aktif — wajar diperbarui dalam hitungan puluhan detik lewat polling ringan.
- **Mencakup dua sumber kejadian**: hasil transaksi PPOB (PLN/Pulsa/dll.) DAN hasil top up saldo — lewat satu fungsi umum yang sama, bukan dua implementasi terpisah.

---

## 3. Rencana Implementasi

### 3.1 Migrasi database (kecil, perlu persetujuan eksplisit sebelum dijalankan)

- Tambah kolom `notifications.recipient_user_id UUID NULL` (selain `recipient_role` yang sudah ada, tidak menghapusnya — notifikasi admin berbasis role tetap jalan seperti sekarang).
- Tambah tipe baru ke constraint `notifications_type_check`: `TRANSACTION_SUCCESS`, `TRANSACTION_FAILED`, `TOPUP_SUCCESS`.

### 3.2 Backend — fungsi baru, aditif, tidak mengubah fungsi yang sudah dikunci

- Fungsi baru `notifyWalletOwner(userId, type, title, body, entity, entityId, db)` di `notification.service.ts`, pola sama seperti `notifySuperAdmin` yang sudah ada.
- **Titik pemanggilan (semua sebagai panggilan BARU dan TERPISAH setelah logika yang sudah ada selesai, di dalam `client`/transaksi DB yang sama untuk atomisitas):**
  1. Transaksi PPOB sukses/gagal — dipanggil setelah `applyDigiflazzResult` (`transaction.service.ts`) selesai. **Tidak mengubah `applyDigiflazzResult`, `captureTransaction`, `releaseTransaction`, atau alur webhook itu sendiri** — sesuai batasan di `FLOW_KERJA_DAN_BATASAN_KERJA_TRANSAKSI.md`.
  2. Top up via Midtrans sukses — di dalam blok `isSuccess` milik `processMidtransNotification` (`wallet-topup.service.ts`), setelah `postLedgerEntry`, di `client` transaksi yang sama.
  3. **Pertanyaan terbuka** (perlu dikonfirmasi sebelum implementasi): apakah top up yang disetujui admin (`approveTopup`) dan "Kirim Saldo ke Mitra" (`sendTopupToMitra`) juga perlu memicu notifikasi yang sama? Ketiganya sama-sama menambah saldo mitra secara nyata, tapi contoh kasus yang dibahas hanya top up mandiri (Midtrans).

### 3.3 Flutter — polling berkala pada lonceng

- `NotificationBell` diubah dari "ambil sekali saat widget dibuka" menjadi polling ringan berkala (interval disarankan 30–60 detik, angka pasti didiskusikan saat implementasi), berhenti otomatis saat widget di-dispose — pola disiplin yang sama seperti bounded polling transaksi yang sudah terbukti bekerja (`purchase_screen.dart`'s `_startPolling`/`_pollOnce`).

---

## 4. Batasan yang Tetap Berlaku

Semua batasan di `FLOW_KERJA_DAN_BATASAN_KERJA_TRANSAKSI.md` tetap berlaku penuh — rencana ini **tidak mengubah satu pun** fungsi yang sudah dikunci di sana (`applyDigiflazzResult`, `transitionTransactionStatus`, `postLedgerEntry`, verifikasi signature webhook, dll.). Prinsip yang sama juga diterapkan ke jalur top up Midtrans meskipun secara teknis belum tercakup literal di dokumen itu: jangan ubah `transitionPaymentStatus`/`verifyMidtransSignature`, hanya menambah panggilan notifikasi baru setelahnya.

Tidak ada migrasi yang dijalankan sebelum dijelaskan dan disetujui eksplisit — sesuai instruksi standing "JANGAN MIGRATION kecuali benar-benar diperlukan dan sudah dijelaskan terlebih dahulu."

---

## 5. Di Luar Cakupan Tahap Ini (dicatat untuk referensi, bukan rencana aktif)

**Push notification asli (muncul di layar kunci/status bar walau aplikasi tertutup)** — proyek terpisah yang jauh lebih besar, butuh:
- Project Firebase eksternal (perlu dibuat/dihubungkan oleh pemilik produk).
- Backend: integrasi Firebase Admin SDK, kredensial baru, tabel penyimpanan token device **per pengguna** (skema `recipient_user_id` di atas cukup untuk in-app, tapi push butuh token device spesifik, bukan sekadar user id).
- Flutter: paket `firebase_messaging`, konfigurasi native Android (`google-services.json`), izin runtime `POST_NOTIFICATIONS` (wajib Android 13+, target SDK aplikasi ini sudah 36), handler kondisi aplikasi di depan/latar/tertutup, deep-link saat notifikasi di-tap.

Tidak dikerjakan sampai diminta secara eksplisit dan konteks Firebase project sudah tersedia.

---

## 6. Ringkasan File yang Akan Tersentuh (saat implementasi nanti)

**Backend (`digides`):**
- Migrasi SQL baru (kolom `recipient_user_id`, tipe notifikasi baru)
- `src/services/notification.service.ts` — fungsi baru `notifyWalletOwner`
- `src/repositories/notification.repository.ts` — query baru untuk `recipient_user_id`
- `src/services/transaction.service.ts` — **satu** pemanggilan baru setelah `applyDigiflazzResult`, bukan perubahan di dalamnya
- `src/services/wallet-topup.service.ts` — satu pemanggilan baru di jalur `isSuccess` milik `processMidtransNotification`
- `src/app/api/notifications/route.ts`, `unread-count/route.ts` — kemungkinan perlu resolve `recipient_user_id` dari session, bukan hanya role

**Flutter (`digides_mitra`):**
- `lib/features/notification/notification_bell.dart` — polling berkala menggantikan fetch sekali
