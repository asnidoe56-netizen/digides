# Pemulihan Akses Akun — Rencana Kerja

**Status:** Belum dikerjakan · dicatat sebagai backlog
**Dibuat:** 9 September 2026
**Pemicu:** kasus nyata di produksi (lihat §1)
**Prioritas:** tinggi — ini kehilangan akses permanen, bukan sekadar ketidaknyamanan
**Menunggu:** dibahas setelah PRD Kasir Pintar

---

## 1. Kasus yang memunculkan ini

Seorang mitra, **Azizah cell** (`julfikarpodungge7@gmail.com`, role Affiliate,
user id `b4814a45-cc9e-4b73-885d-756844026676`), tidak bisa masuk ke akunnya.

Yang terjadi: dia lupa email **dan** password, mencoba menebak berkali-kali,
lalu akunnya terkunci otomatis 15 menit. Kondisi di produksi saat diperiksa:

```
locked_until : 2026-09-09 11:06:41 WIB
diperiksa    : 2026-09-09 10:55:29 WIB
sisa         : 11 menit 11 detik
status       : ACTIVE
```

Kuncinya dipasang 10:51:41 WIB dan lepas sendiri 15 menit kemudian.

**Sistemnya tidak rusak.** Penguncian ini persis perilaku yang dirancang di
`security.service.ts` `recordFailedLogin()` sesuai `security_policies`
(`max_login_attempts`, `login_lockout_minutes`). Yang bermasalah adalah apa
yang terjadi *setelah* kunci itu lepas.

---

## 2. Masalah sebenarnya: menunggu tidak menyelesaikan apa pun

Kunci 15 menit lepas sendiri, lalu mitra ini mencoba menebak lagi, salah lagi,
dan terkunci lagi. Berputar tanpa ujung.

Penelusuran seluruh kode menemukan: **tidak ada satu pun jalur pemulihan
password yang terlupa di Digides.**

| Yang dicari | Ada? |
|---|---|
| Halaman "Lupa Password" | Tidak ada |
| Reset password oleh admin | Tidak ada |
| OTP / verifikasi WhatsApp | Tidak ada gateway sama sekali |
| `POST /api/account/change-password` | Ada — **tapi meminta password lama** |

Rute ganti password yang ada justru tidak berguna bagi orang yang lupa, karena
syaratnya adalah mengetahui password lamanya.

Bagian "lupa email" sebenarnya mudah: emailnya terlihat oleh Super Admin di
halaman detail pengguna, tinggal diberitahukan. **Passwordnya yang buntu
total** — akun ini, dalam kondisi sistem sekarang, tidak akan pernah bisa
diakses lagi oleh pemiliknya. Padahal akun mitra memegang saldo.

---

## 3. Kemampuan yang sudah ada tapi salah tempat

Membuka kunci akun **sudah bisa dilakukan hari ini**, lewat jalur yang tidak
terduga: `setSecurityIncidentStatusAndAudit()` di
`src/services/security.service.ts` (baris 428-431) memanggil
`clearUserAccountLock()` ketika Super Admin me-*resolve* insiden
`BRUTE_FORCE_LOGIN` di menu **Keamanan → Insiden**.

Jadi kemampuannya ada. Letaknya yang salah.

Ketika admin menerima laporan "pengguna tidak bisa masuk", yang dia buka adalah
**halaman detail pengguna itu**. Halaman itu menampilkan status `Aktif` — benar,
tapi tidak menolong, karena `locked_until` tidak ditampilkan sama sekali. Lalu
satu-satunya yang ditawarkan adalah dua tombol yang justru memperburuk keadaan:
**Tangguhkan** dan **Hapus**.

Admin tidak akan pernah menebak bahwa jawabannya ada di menu Insiden Keamanan.

---

## 4. Yang harus dikerjakan

### Prioritas 1 — Atur ulang password dari panel admin

Super Admin membuat password sementara untuk pengguna; pengguna wajib
menggantinya saat login berikutnya.

**Kenapa ini aman untuk dibangun.** PIN transaksi tersimpan terpisah dari
password, di tabelnya sendiri, dan diverifikasi lewat `verifyTransactionPin()`.
Admin yang mengatur ulang password **tetap tidak bisa membelanjakan uang siapa
pun** karena dia tidak memegang PIN-nya. Pemisahan itulah yang menjadi jaring
pengaman fitur ini.

Syarat yang wajib ikut, tidak boleh ada yang dilewat:

- dicatat di **audit log** (`recordAuditLog`), aksi `USER_PASSWORD_RESET`;
- **semua sesi lama dicabut** (`revokeAllSessionsForUser`), supaya sesi yang
  mungkin sudah dikuasai orang lain ikut mati;
- password sementara **hanya ditampilkan sekali** kepada admin;
- pengguna **dipaksa mengganti** password saat login berikutnya;
- **PIN transaksi tidak pernah ikut disentuh** — ini batas kerasnya.

### Prioritas 2 — Status kunci dan tombol buka kunci di halaman pengguna

Kerjakan ini lebih dulu: kecil, dan langsung menghapus kebingungan admin.

- Tampilkan `locked_until` beserta **sisa waktunya** di halaman detail pengguna
  Super Admin, berdampingan dengan status akun.
- Tambahkan tombol **"Buka Kunci"** yang memanggil `clearUserAccountLock()` —
  logikanya sudah ada, tinggal dipanggil dari tempat yang benar-benar dilihat
  admin.
- Catat di audit log seperti aksi admin lainnya.

Jalur lewat Insiden Keamanan tetap dipertahankan; ini menambah pintu kedua di
tempat yang wajar, bukan memindahkan.

### Prioritas 3 — "Lupa Password" mandiri lewat OTP WhatsApp

Ini jawaban yang sesungguhnya, karena tidak menyeret admin setiap kali ada
mitra yang lupa. Nomor WhatsApp mitra sudah tersimpan saat pendaftaran, jadi
datanya siap.

**Tapi Digides belum punya gateway WhatsApp sama sekali** — yang ada hanya
tautan CS di pengaturan dukungan. Ini berarti proyek tersendiri: pilih penyedia,
tangani biaya per pesan, batasi laju permintaan, tangani token kedaluwarsa.

Ditunda. Dibahas sebagai keputusan terpisah ketika jumlah mitra membuat cara
manual terasa berat.

---

## 5. Urutan yang disarankan

1. **Prioritas 2** — kecil, langsung berguna, menghapus kebingungan admin.
2. **Prioritas 1** — yang benar-benar memulihkan akses mitra seperti Azizah cell.
3. **Prioritas 3** — proyek tersendiri, belum sekarang.

---

## 6. Catatan untuk kasus Azizah cell

Sampai Prioritas 1 selesai, akun ini **belum bisa dipulihkan**. Membuka kuncinya
lewat Keamanan → Insiden hanya menghentikan penguncian, tidak mengembalikan
password yang terlupa. Emailnya bisa langsung diberitahukan:
`julfikarpodungge7@gmail.com`.
