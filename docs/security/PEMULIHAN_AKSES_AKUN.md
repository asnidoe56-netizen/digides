# Pemulihan Akses Akun — Rencana Kerja

**Status:** Prioritas 1 & 2 **selesai** (9 September 2026) · Prioritas 3 masih ditunda
**Dibuat:** 9 September 2026
**Pemicu:** kasus nyata di produksi (lihat §1)
**Prioritas:** tinggi — ini kehilangan akses permanen, bukan sekadar ketidaknyamanan
**Menunggu:** Prioritas 3 menunggu gateway WhatsApp

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

Sejak Prioritas 1 selesai, akun ini **sudah bisa dipulihkan**. Langkahnya, di
panel Super Admin → Pengguna → Azizah cell → **Pemulihan Akses**:

1. Tekan **Atur Ulang Password**. Password sementara muncul sekali — catat.
2. Sampaikan langsung kepadanya, beserta emailnya:
   `julfikarpodungge7@gmail.com`.
3. Dia masuk memakai password sementara itu, dan aplikasi langsung membawanya
   ke Ganti Password. Isi "Password Saat Ini" dengan password sementara tadi.

Tombol **Buka Kunci** tidak diperlukan di kasusnya: mengatur ulang password
sekaligus membuka kuncinya. Buka Kunci berguna untuk kasus yang berbeda —
seseorang yang **ingat** passwordnya tapi terkunci karena salah ketik
berkali-kali.

---

## 7. Apa yang sudah dibangun (9 September 2026)

**Migrasi `054_admin_password_reset.sql`** — satu kolom, `users.must_change_password`.

**Backend**

| Berkas | Isi |
|---|---|
| `src/services/account-recovery.service.ts` | `resetUserPasswordAsAdmin`, `unlockUserAccount` |
| `src/repositories/user.repository.ts` | `resetUserPasswordByAdmin` (fungsi terpisah dari `updateUserPassword`) |
| `POST /api/users/[id]/reset-password` | Super Admin saja |
| `POST /api/users/[id]/unlock` | Super Admin saja |

**Antarmuka**

- Halaman pengguna Super Admin: status kunci beserta sisa menitnya, panel
  **Pemulihan Akses** yang sengaja dipisah dari **Aksi Akun** — pemulihan
  mengembalikan akun, Tangguhkan dan Hapus mengambilnya.
- Password sementara ditampilkan sekali dalam dialog dengan tombol salin.
- Flutter: login dengan password sementara langsung mendarat di Ganti Password
  tanpa layar di belakangnya.
- Web: login mengarahkan ke Ganti Password untuk BUMDes dan Konter.

### Keputusan yang perlu diketahui orang berikutnya

**`resetUserPasswordByAdmin` sengaja fungsi terpisah**, bukan parameter pada
`updateUserPassword`. Keduanya melakukan hal berlawanan pada
`must_change_password`, dan mencampurnya akan jadi kegagalan yang tidak
bersuara: password terbitan admin yang **tidak** memasang tanda itu akan
diam-diam menjadi password tetap akun tersebut, diketahui orang yang bukan
pemiliknya.

**Password sementara tidak pernah tersimpan sebagai teks.** Hanya hash
bcrypt-nya, di `password_hash`, seperti password biasa. Kalau admin kehilangan
catatannya sebelum sempat menyampaikan, dia mengulang reset dan mendapat yang
berbeda. Itu ongkos yang disengaja.

**Abjadnya tanpa 0, O, 1, I, dan l.** Password ini dibaca dari layar dan
diucapkan lewat telepon; salah dengar satu huruf mengirim mitra kembali ke
penguncian yang justru sedang diakhiri.

**Pemaksaan ganti password itu arahan, bukan gerbang.** Orang yang menutup
paksa aplikasinya lalu membukanya lagi mendarat di beranda, karena cookie
sesinya memang sudah sah. Yang benar-benar menahan risiko admin menerbitkan
password ada di tempat lain: setiap reset tercatat di audit log atas nama
admin itu, dan **PIN transaksi tidak pernah disentuh** — reset saja tidak bisa
memindahkan satu rupiah pun.

### Yang masih kurang

- **AFFILIATE dan SUPER_ADMIN tidak punya halaman Ganti Password di web.**
  `changePasswordRouteForRoles` mengembalikan null untuk keduanya, dan
  pemanggilnya jatuh ke beranda. Untuk AFFILIATE — yaitu sebagian besar
  mitra — jalur nyatanya ada di aplikasi Digides Mitra, tempat alur paksa itu
  memang bekerja.
- Prioritas 3 (OTP WhatsApp) belum dikerjakan sama sekali.

### Verifikasi

18 pemeriksaan lewat API sungguhan di server dev, semuanya lulus — termasuk:
akun terkunci ditolak walau passwordnya benar; membuka kunci akun yang tidak
terkunci ditolak alih-alih pura-pura berhasil; password lama langsung mati;
hash PIN transaksi sama persis sebelum dan sesudah reset; password sementara
tidak muncul di `users` maupun di `audit_logs`; dan non-Super-Admin ditolak.
