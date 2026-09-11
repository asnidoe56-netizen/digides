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

---

## 6. Belum dikerjakan (dari audit yang sama)

- **Kunci cadangan kedua** milik pemilik server, dan kunci terpisah untuk `root` dan `digides` — hari ini satu kunci membuka keduanya.
- Rate limit di Nginx untuk pemindai yang menghasilkan puluhan ribu respons 4xx.
- Next.js hanya mendengarkan `localhost:3000` (hari ini `*:3000`, tertahan UFW).
- Kuota bandwidth: lalu lintas broadcast dari jaringan provider — harus diselesaikan provider.
