# Pengerasan SSH VPS

**12 September 2026** · atas persetujuan eksplisit pemilik server · VPS `digidespay` (202.10.40.155, Ubuntu 24.04.4, OpenSSH 9.6p1)

---

## 1. Kenapa

Audit keamanan baca-saja sebelumnya menemukan SSH terbuka untuk **login root dengan password** dari seluruh internet, tanpa fail2ban:

- `PermitRootLogin yes` (di `sshd_config`) dan `PasswordAuthentication yes` (di `50-cloud-init.conf`, bawaan provider).
- **144.705 percobaan password gagal** tercatat di `auth.log` sejak rotasi 6 September saja.
- Banjir itu ikut mengganggu koneksi yang sah: selama deploy dan audit, server berulang kali memutus koneksi SSH baru (`MaxStartups`).

Pemeriksaan sebelum mengubah apa pun menunjukkan tidak ada orang yang bergantung pada password:

- Hanya **satu** kunci yang terdaftar, untuk `root` maupun `digides`: `claude-code@digidespay-deploy` (`SHA256:wKw1GKvfOQ3VQbcSIJ1oOZ1mX0crjPTvBSAYGk66uBo`).
- Semua login yang berhasil sejak 2 September memakai kunci itu. Login password hanya pernah berhasil sekali: 2 September 07:40 WIB, saat server disiapkan. Pemilik server mengonfirmasi tidak pernah masuk ke server selain lewat sesi kerja Claude Code.

---

## 2. Yang diubah

### 2.1 SSH — `/etc/ssh/sshd_config.d/00-digidespay-hardening.conf` (berkas baru)

```
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
PermitEmptyPasswords no
X11Forwarding no
MaxAuthTries 3
LoginGraceTime 30
```

Berkas ini dibaca **sebelum** `50-cloud-init.conf` dan sebelum baris-baris `sshd_config`. sshd memakai nilai pertama yang ditemuinya, jadi baris di sini yang berlaku — tanpa mengubah berkas milik provider, dan tetap berlaku walau cloud-init menulis ulang `50-cloud-init.conf`.

### 2.2 fail2ban — `/etc/fail2ban/jail.d/digidespay-sshd.local` (paket baru, fail2ban 1.0.2)

```
[sshd]
enabled = true
mode = aggressive
maxretry = 5
findtime = 10m
bantime = 1h
bantime.increment = true
bantime.maxtime = 1w
```

`mode = aggressive`, bukan `normal`. Setelah password dimatikan, bot tidak lagi menghasilkan baris *"Failed password"*: mereka melihat server hanya menawarkan kunci, lalu menyerah — tercatat sebagai *"Connection closed by authenticating user root … [preauth]"*, *"Received disconnect … Bye Bye [preauth]"*, atau *"Disconnected from authenticating user … [preauth]"*. Mode `normal` tidak menghitung baris-baris itu sebagai kegagalan; ia hanya menghitung *"Invalid user"*. Diukur dengan `fail2ban-regex` atas 76 baris log 5 menit pertama sesudah perubahan: mode `aggressive` menghitung **21** baris sebagai kegagalan, mode `normal` hanya **6**.

### 2.3 Yang sengaja tidak disentuh

`sshd_config`, `50-cloud-init.conf`, UFW, Nginx, aplikasi, dan database. Selama pemasangan fail2ban, `needrestart` ditangguhkan supaya tidak ada layanan lain yang ikut di-restart. SSH di-**reload**, bukan di-restart.

Cadangan konfigurasi sebelum perubahan: `/root/sshd_config.bak-2026-09-12` dan `/root/50-cloud-init.conf.bak-2026-09-12`.

---

## 3. Cara masuk ke server sekarang

1. **SSH hanya dengan kunci.** Berkas kunci privatnya ada di laptop pemilik: `~/.ssh/id_ed25519_digidespay_vps` (alias `digidespay-vps` di `~/.ssh/config`). **Ini satu-satunya kunci yang terdaftar — simpan salinannya di tempat aman.** Kalau berkas ini hilang, SSH tertutup untuk semua orang.
2. **Konsol web di panel provider** (VNC/KVM) dengan password root. Konsol ini tidak lewat SSH, jadi tidak terpengaruh perubahan di atas. Pemilik server mengonfirmasi punya akses ke panel dan password root sebelum perubahan dijalankan.

---

## 4. Verifikasi (12 September 2026)

- [x] `sshd -t` lulus sebelum reload; nilai efektif `sshd -T`: `passwordauthentication no`, `permitrootlogin without-password` (sinonim `prohibit-password`), `x11forwarding no`, `maxauthtries 3`, `logingracetime 30`.
- [x] **Sakelar pengaman** dipasang sebelum reload: timer `systemd-run` 10 menit yang menghapus berkas pengerasan dan me-reload SSH. Dibatalkan hanya setelah dua uji berikut lulus.
- [x] Koneksi baru dengan kunci: **berhasil**.
- [x] Koneksi tanpa kunci, hanya password: **ditolak** — `Permission denied (publickey)`, server tidak lagi menawarkan metode password.
- [x] fail2ban aktif, uji konfigurasi `OK`, jail `sshd` berjalan (backend systemd). 3 IP terblokir sejak paket dipasang — oleh jalankan pertama dengan konfigurasi bawaan, lalu dipulihkan saat konfigurasi ini dimuat. Dalam 5 menit pertama dengan konfigurasi ini, jail menghitung 12 kegagalan tanpa blokir baru: kebanyakan bot hanya mencoba 1–2 kali per IP, di bawah ambang 5.
- [x] Pembanding 5 menit sebelum vs 5 menit sesudah perubahan (`auth.log`, cap waktu WIB): *Failed password* **27 → 0**; *Accepted password* 0 → 0.
- [x] Situs publik `/` dan `/login` tetap `200`.

---

## 5. Kalau terkunci, atau perlu membatalkan

| Keadaan | Langkah (dari konsol panel provider kalau SSH tertutup) |
|---|---|
| Kembalikan SSH seperti sebelumnya | `rm /etc/ssh/sshd_config.d/00-digidespay-hardening.conf && systemctl reload ssh` |
| IP sendiri terblokir fail2ban | Tunggu 1 jam, atau `fail2ban-client set sshd unbanip <IP>` |
| Matikan fail2ban | `systemctl disable --now fail2ban` |
| Tambah kunci baru | Tambahkan baris kunci publik ke `/root/.ssh/authorized_keys` (dan/atau `/home/digides/.ssh/authorized_keys`) |
| IP sah terblokir di web | Cek jail mana dengan `fail2ban-client status digidespay-scanner` / `digidespay-malformed`, lalu `fail2ban-client set <jail> unbanip <IP>` |
| Matikan salah satu blokir web | Di `/etc/fail2ban/jail.d/digidespay-nginx.local`, ubah `enabled = true` menjadi `false` pada `[digidespay-scanner]` atau `[digidespay-malformed]`, lalu `fail2ban-client reload` |
| Matikan semua blokir web | Hapus `/etc/fail2ban/jail.d/digidespay-nginx.local`, lalu `fail2ban-client reload` |

---

## 6. Blokir otomatis pemindai web (fail2ban untuk Nginx)

Ditambahkan 12 September 2026 atas permintaan pemilik server.

**Yang diblokir:** IP yang dalam 10 menit meminta **3 kali atau lebih** jalur milik teknologi yang tidak ada di aplikasi ini — berkas `.php`, berkas tersembunyi (`/.env`, `/.git`, `/.aws`; kecuali `/.well-known`), WordPress (`/wp-admin`, `/wp-login`, …), phpMyAdmin, `cgi-bin`, phpunit, serta probe Docker, Elasticsearch, dan Hikvision. Blokir 1 jam, naik bertahap sampai 1 minggu untuk yang mengulang, **hanya di port 80/443** — SSH tidak ikut tertutup.

Berkas: `/etc/fail2ban/filter.d/digidespay-scanner.conf` dan `/etc/fail2ban/jail.d/digidespay-nginx.local`. Jail membaca `/var/log/nginx/access.log` langsung (`backend = auto`), karena bawaan Ubuntu membaca journal systemd.

**Pengecualian (`ignoreip`):** `127.0.0.1/8`, `::1`, IP server sendiri `202.10.40.155`, dan sumber webhook Digiflazz `52.74.250.133`.

**Sengaja tidak dipakai:**
- **Filter bawaan `nginx-bad-request`** — memblokir *setiap* respons 400, termasuk respons aplikasi untuk mitra yang salah PIN. Mitra seluler sering berbagi satu IP operator, jadi satu mitra yang salah PIN bisa membuat banyak mitra lain ikut terblokir.
- **Blokir berdasarkan jumlah 404** — webhook Digiflazz "Cek Nama" memang dijawab 404, dan validasi sertifikat `/.well-known/acme-challenge` menghasilkan ratusan 404.
- **Permintaan kosong (`""`) sebagai tanda serangan** — browser seperti Chrome kadang membuka koneksi lalu menutupnya tanpa mengirim apa pun; di uji pertama pola ini ikut menandai IP yang sedang memuat aplikasi. Filter permintaan rusak (Bagian 6a) sengaja tidak menghitungnya.

**Diuji sebelum dipasang** — `fail2ban-regex` atas 119.095 baris log Nginx (3–12 September), dalam tiga putaran:
- Putaran pertama "menangkap" jalur aplikasi seperti `/api/.env` dan `/_next/../.aws/credentials`. Setelah dirinci, semuanya probe yang diselipkan ke jalur aplikasi, bukan lalu lintas mitra. Pengecualian `/_next/` sempat dicoba di putaran kedua lalu dibuang, karena justru meloloskan probe itu.
- Versi akhir: 17.630 baris cocok; **0** pada berkas statis Next.js yang sah, **0** pada `/.well-known`, **0** dari webhook Digiflazz.
- Simulasi ambang: dari 627 IP yang pernah cocok, 183 akan terblokir; 444 hanya cocok 1–2 kali. Tidak ada rentang seluler mitra (36.85.x, 182.1.x, 114.125.x) di antaranya.

**Diverifikasi setelah dipasang:**
- [x] Uji konfigurasi `OK`; `fail2ban-client reload` — jail `sshd` tetap berjalan beserta blokirnya.
- [x] Jail membaca `/var/log/nginx/access.log`; `maxretry 3`, `findtime 600`, `bantime 3600`; `ignoreip` sesuai.
- [x] Uji aksi dengan alamat uji `192.0.2.10` (TEST-NET, bukan milik siapa pun): masuk ke set nftables `addr-set-digidespay-scanner` dengan aturan `tcp dport { 80, 443 } … reject`, lalu hilang setelah `unbanip`.
- [x] Situs publik tetap `200`.
- [x] Blokir benar-benar menang atas UFW: chain `f2b-chain` terpasang di `hook input priority filter - 1`, dijalankan **sebelum** chain `INPUT` milik UFW (`priority filter`), dan `reject` bersifat final — jadi aturan UFW yang menerima port 80/443 tidak meloloskan IP yang diblokir. Diperiksa lewat definisi chain, bukan dengan memblokir IP sungguhan, karena IP operator seluler bisa dipakai bersama mitra lain.

---

## 6a. Blokir permintaan rusak ke port web

Ditambahkan 12 September 2026 atas permintaan pemilik server, setelah Bagian 6.

**Yang diblokir:** IP yang dalam 10 menit mengirim **2 kali atau lebih** baris permintaan yang sama sekali bukan HTTP dan dijawab 400 — probe TLS, RDP (`Cookie: mstshash=`), SMB, `PRI *`, `t3 …` (WebLogic), dan sejenisnya. Aturan blokirnya sama dengan Bagian 6: 1 jam, naik bertahap sampai 1 minggu, hanya port 80/443, `ignoreip` yang sama.

Berkas: `/etc/fail2ban/filter.d/digidespay-malformed.conf`, dan jail `[digidespay-malformed]` di `/etc/fail2ban/jail.d/digidespay-nginx.local`.

**Sengaja tidak dihitung:**
- Permintaan kosong (`""`) — browser kadang membuka koneksi lalu menutupnya tanpa mengirim apa pun.
- Baris HTTP yang sah tapi dijawab 400, misalnya mitra salah PIN — hanya baris yang tidak diawali metode HTTP yang dihitung.

**Diuji sebelum dipasang** — `fail2ban-regex` atas 119.111 baris log Nginx: 340 baris cocok; **0** permintaan kosong, **0** jalur aplikasi, **0** webhook Digiflazz. Skrip pemasangan dibatalkan otomatis kalau salah satu dari ketiganya bukan 0.
- Empat IP yang cocok sekaligus pernah memuat aplikasi, semuanya bot: skrip `python-requests`, pemindai `CensysInspect`, klien dengan user agent palsu (`AppleWebKit/553.43`, versi yang tidak pernah ada), dan pengambil halaman massal (843 permintaan). Tiga di antaranya hanya cocok sekali — di bawah ambang.
- Simulasi ambang: 58 dari 159 IP akan terblokir dengan ambang 2 (31 dengan ambang 3). Ambang 2 dipilih karena browser dan aplikasi mitra tidak pernah mengirim baris permintaan non-HTTP.

**Diverifikasi setelah dipasang:**
- [x] Uji konfigurasi `OK`; `fail2ban-client reload` — ketiga jail (`sshd`, `digidespay-scanner`, `digidespay-malformed`) berjalan, blokir `sshd` tetap utuh.
- [x] `maxretry 2`, `findtime 600`, `bantime 3600`.
- [x] Uji aksi dengan alamat uji `192.0.2.11`: masuk ke set `addr-set-digidespay-malformed` dengan aturan `tcp dport { 80, 443 } … reject`, lalu hilang setelah `unbanip`.
- [x] Situs publik tetap `200`.

---

## 7. Belum dikerjakan (dari audit yang sama)

- **Kunci cadangan kedua** milik pemilik server, dan kunci terpisah untuk `root` dan `digides` — hari ini satu kunci membuka keduanya. Salinan kunci yang ada sudah disimpan di `E:\Cadangan-Kunci-SSH-Digidespay` dan terbukti bisa login, tapi masih di disk laptop yang sama; salinan berpassphrase di luar laptop belum dibuat.
- Rate limit di Nginx. Pemindai yang meminta jalur asing kini diblokir fail2ban (Bagian 6), tapi lonjakan permintaan ke jalur aplikasi yang sah belum dibatasi.
- Next.js hanya mendengarkan `localhost:3000` (hari ini `*:3000`, tertahan UFW).
- Kuota bandwidth: lalu lintas broadcast dari jaringan provider — harus diselesaikan provider.
