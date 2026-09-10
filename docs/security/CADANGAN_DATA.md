# Cadangan Data Digides

**Status:** Terpasang dan **sudah diuji pulih** · 10 September 2026
**Dipasang karena:** audit kesiapan uji coba sebulan menemukan Digides
berjalan di produksi dengan uang sungguhan tanpa cadangan sama sekali

---

## 1. Kenapa ini ada

Sampai 10 September 2026, produksi Digides tidak punya cadangan dalam
bentuk apa pun: tidak ada berkas dump, tidak ada cron, dan
`scripts/backup.ts` sendiri kosong 0 byte sejak 29 Agustus.

Yang membuat ini serius bukan sekadar "data bisa hilang". **Ledger Digides
adalah uangnya.** `wallet_ledger`, `store_order_items`,
`store_inventory_events`, `wallet_transfers`, dan `store_settlements`
semuanya append-only dengan trigger `forbid_mutation()` — dirancang justru
supaya tidak bisa diubah. Konsekuensinya: kalau hilang, tidak ada apa pun
yang bisa menyusunnya ulang. Saldo setiap mitra adalah jumlah dari
baris-baris itu.

---

## 2. Dua hal yang berbeda, dan jangan tertukar

| | Cadangan pemulihan | Salinan catatan |
|---|---|---|
| **Bentuk** | `pg_dump` terkompresi | JSON |
| **Di mana** | `/home/digides/backups` di server | Diunduh dari Super Admin |
| **Gunanya** | Menghidupkan kembali sistem yang hilang | Diperiksa, diarsipkan, dibuka dengan alat biasa |
| **Isi kredensial?** | Ya (hash password ikut) | **Tidak** — sengaja dibuang |
| **Bisa memulihkan Digides?** | **Ya** | Tidak |

Halaman Super Admin mengatakan perbedaan ini dengan keras di layarnya, dan
peringatannya juga ikut tertulis di dalam berkas JSON-nya sendiri — berkas
itu akan dibuka berbulan-bulan kemudian oleh orang yang tidak membaca
halaman yang mengunduhnya.

---

## 3. Cadangan pemulihan (pg_dump)

**Jadwal:** setiap hari pukul **02:15 WIB**, lewat crontab pengguna
`digides`.

```cron
15 2 * * * cd /home/digides/app && /usr/bin/node --env-file=.env \
  --experimental-strip-types scripts/backup.ts >> /home/digides/backups/backup.log 2>&1
```

**Lokasi:** `/home/digides/backups/digides_YYYY-MM-DD_HHMM.sql.gz`
**Retensi:** 14 hari (ubah lewat `BACKUP_RETENTION_DAYS`)
**Ukuran saat ini:** ~755 KB per berkas — 14 hari ≈ 11 MB, sementara disk
sisa 69 GB. Tidak ada kekhawatiran ruang selama uji coba.

### Keputusan di dalam skripnya

**Memanggil `pg_dump`, bukan menulis SQL sendiri.** pg_dump tahu soal
urutan foreign key, tipe khusus, trigger, dan indeks — hal-hal yang justru
menentukan apakah pemulihan benar-benar bisa dilakukan, dan yang paling
gampang salah kalau ditulis tangan.

**`--no-owner --no-privileges`.** Supaya dump-nya bisa dipulihkan ke server
lain dengan nama peran yang berbeda. Pemulihan yang mensyaratkan peran
persis sama adalah pemulihan yang gagal justru pada hari servernya harus
diganti.

**Dump yang gagal di tengah jalan berkasnya dihapus.** Berkas separuh jadi
lebih berbahaya daripada tidak ada berkas: ia terlihat seperti cadangan
sampai hari seseorang mencoba memakainya.

---

## 4. Bukti bahwa cadangannya benar-benar bisa dipulihkan

Cadangan yang belum pernah diuji pulih bukan cadangan, melainkan harapan.
Pada 10 September 2026 berkas cadangan pertama dipulihkan ke database
terpisah (`uji_pulih_cadangan`, dihapus setelahnya — produksi tidak
disentuh), lalu dibandingkan:

| | Hasil pulih | Produksi |
|---|---|---|
| `wallet_ledger` | 145 | 145 |
| `transactions` | 51 | 51 |
| `users` | 14 | 14 |
| `store_orders` | 11 | 11 |
| Trigger `*immutable*` | 7 | 7 |

Baris terakhir yang paling penting dan paling mudah terlewat: **ketujuh
trigger append-only ikut pulih.** Pemulihan yang membawa datanya tapi
kehilangan trigger-nya akan tampak berhasil sepenuhnya, sementara jaminan
yang menjadi dasar seluruh pembukuan diam-diam hilang.

### Cara memulihkan

```bash
# 1. Buat database kosong
sudo -u postgres createdb ppob_bumdes_pulih

# 2. Pulihkan dari berkas cadangan
zcat /home/digides/backups/digides_YYYY-MM-DD_HHMM.sql.gz \
  | sudo -u postgres psql -d ppob_bumdes_pulih

# 3. Periksa dulu sebelum dipakai
sudo -u postgres psql -d ppob_bumdes_pulih -c \
  "SELECT count(*) FROM wallet_ledger"
sudo -u postgres psql -d ppob_bumdes_pulih -c \
  "SELECT count(*) FROM pg_trigger WHERE tgname LIKE '%immutable%'"

# 4. Baru arahkan DATABASE_URL di .env ke database itu, lalu restart pm2
```

**Jangan memulihkan menimpa database yang sedang berjalan.** Pulihkan ke
nama baru, periksa, baru pindahkan sambungannya.

---

## 5. Salinan catatan (JSON) di Super Admin

**Super Admin → Cadangan Data → Unduh JSON**

Berisi seluruh catatan usaha: transaksi, ledger, dompet, pesanan toko,
komisi, referral, katalog, audit log.

**Yang sengaja tidak ikut, dan alasannya:**

- **Password, PIN transaksi, kunci sesi, kredensial biometrik** — berkas
  ini akan diunduh ke laptop, dikirim lewat pesan, dan disimpan di folder
  yang tidak pernah dibersihkan. Kredensial tidak boleh ikut ke perjalanan
  itu. `users` dibaca dengan kolom yang disebut satu per satu, bukan
  `SELECT *` lalu disaring — `password_hash` tidak pernah ikut terbaca
  sejak awal.
- **`digiflazz_settings`, `midtrans_settings`** — kunci API penyedia.
  Bocornya satu berkas ini berarti orang lain bisa berbelanja atas nama
  Digides.
- **`wilayah`** — puluhan ribu baris acuan statis yang bisa dimuat ulang
  kapan saja.
- **`login_activities`, `notifications`** — riwayat operasional bervolume
  tinggi tanpa nilai usaha.

**Endpointnya tidak menerima parameter apa pun** — tidak ada pilihan
tabel, tidak ada rentang tanggal. Endpoint yang menerima nama tabel dari
luar akan menjadi cara membaca tabel yang sengaja dikecualikan.

**Setiap pengunduhan tercatat di Audit Log** (`DATA_EXPORT_DOWNLOADED`).
Siapa mengambil seluruh riwayat keuangan platform dan kapan adalah hal
yang harus bisa dijawab, bukan ditebak.

---

## 6. Yang masih kurang

**Cadangannya masih di server yang sama dengan databasenya.** Kalau
servernya sendiri hilang — disk rusak, akun dihapus, VPS ditarik —
cadangannya ikut hilang. Untuk uji coba sebulan ini masih bisa diterima,
tapi sebelum jumlah mitra bertambah, salinannya perlu keluar dari mesin
itu: `rclone` ke penyimpanan awan, atau sekadar `scp` terjadwal ke
komputer lain. Ini keputusan tersendiri karena menyangkut biaya dan tempat
menyimpan kredensial tujuannya.

**Belum ada pemberitahuan kalau cadangannya gagal.** Cron menulis ke
`/home/digides/backups/backup.log`, tapi tidak ada yang membacanya. Cara
paling sederhana memeriksanya selama uji coba:

```bash
ls -lh /home/digides/backups/ | tail -5
```

Kalau berkas terbaru bukan hari ini, ada yang salah.
