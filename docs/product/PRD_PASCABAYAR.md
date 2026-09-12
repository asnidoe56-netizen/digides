# PRD Pembayaran Tagihan (Pascabayar)

**Versi 1.2 — draf** · 12 September 2026 · **Belum dikerjakan**

> **Status.** Rancangan. Belum ada satu baris kode pascabayar pun di sistem
> hari ini (lihat Bagian 2). Pembayaran tagihan menyentuh mesin transaksi
> yang terkunci (`FLOW_KERJA_DAN_BATASAN_KERJA_TRANSAKSI.md`), jadi
> **Tahap 3 tidak boleh dimulai sebelum amandemen Bagian 9 disetujui secara
> sadar oleh pemilik produk.**
>
> **Dokumentasi Digiflazz yang sudah diterima:** cek tagihan (`inq-pasca`),
> bayar (`pay-pasca`, terpotong di respons BPJSTKPU), dan **Cek Status**
> (`status-pasca`, diterima di v1.1). Yang masih belum terbaca: sisa respons
> `pay-pasca` BPJSTKPU, daftar rc, dan test case pascabayar. Semua hal yang
> bergantung pada bagian itu ditandai **⚠ VERIFIKASI** dan dikumpulkan di
> Tahap 0.
>
> **Perubahan v1.1:**
> - Cek status `status-pasca` terkonfirmasi (7.6).
> - Jawaban "Data belum ada" tidak pernah melepas saldo (7.6).
> - Aturan Digiflazz "jangan ulang panggilan untuk transaksi yang sama dalam
>   < 1 menit" dan batas umur cek status **sudah berlaku untuk prabayar**
>   lewat amandemen §5e dokumen terkunci (2026-09-11), setelah terbukti
>   dilanggar 7 kali di produksi. Pascabayar mewarisinya tanpa kode jeda
>   baru (7.17).

> **Perubahan v1.2 — hasil Tahap 0 langkah 2 (12 September 2026).** Daftar
> harga pascabayar diambil langsung dari Digiflazz (baca saja). Akun ini
> hanya punya **7 produk**, semuanya aktif, dalam **satu kategori bernama
> "Pascabayar"**: PLN Pascabayar, Telkomsel Omni, tiga internet (SPEEDY &
> INDIHOME, BIZNET HOME, BNETFIT), dan dua PDAM (Aetra, Batam). **BPJS
> Kesehatan tidak tersedia**, begitu juga Multifinance, TV, PBB, SAMSAT,
> dan Gas. Ruang lingkup (Bagian 4) dan alasan pemisahan kategori
> (Bagian 7.9) sudah disesuaikan dengan kenyataan ini.

Lanjutan dari mesin transaksi yang terkunci, PRD Cashback, dan sistem komisi.
Migrasi berikutnya: **057**

---

## 1. Ringkasan

Mitra bisa membayar **tagihan bulanan** pelanggannya — PLN pascabayar,
PDAM, BPJS Kesehatan, internet, dan seterusnya — dari saldo utamanya.

Berbeda dengan pulsa atau token, **nilai tagihan tidak diketahui sebelum
dicek**. Karena itu setiap pembayaran selalu dua langkah:

```
1. CEK TAGIHAN   → Digiflazz menjawab: nama pelanggan, periode, nilai tagihan,
                   denda, biaya admin. Belum ada uang bergerak.
2. BAYAR         → mitra melihat rinciannya, memasukkan PIN, saldo dipotong
                   sebesar angka yang tadi tampil di layar.
```

Contoh perhitungan (**angka ilustrasi, bukan harga produksi**):

| | |
|---|---|
| Nilai tagihan PLN (termasuk denda) | Rp148.500 |
| Biaya admin (dari Digiflazz, `admin`) | Rp2.500 |
| Harga jual saran Digiflazz (`selling_price`) | Rp151.000 |
| Yang dipotong dari deposit Digides (`price`) | Rp149.800 |
| Biaya layanan Digides (aturan markup pascabayar) | Rp1.000 |
| **Yang dibayar mitra** | **Rp152.000** |
| **Margin Digides** = 152.000 − 149.800 | **Rp2.200** |

Margin ini — selisih yang dibayar mitra dengan yang dipotong dari deposit —
adalah definisi margin yang **sama persis** dengan yang sudah dipakai
komisi dan cashback hari ini (`selling_price − base_price`). Itu keputusan
paling penting di dokumen ini (Bagian 7.8): komisi dan cashback bekerja
untuk tagihan tanpa diubah.

> ⚠ VERIFIKASI: arti pasti `price` vs `selling_price` pada respons
> `inq-pasca` (apakah `price` sudah dikurangi komisi Digiflazz) harus
> dipastikan dengan satu cek tagihan sungguhan di Tahap 0 — seluruh
> perhitungan margin bergantung padanya.

---

## 2. Kondisi hari ini

Sudah diperiksa langsung di kode dan basis data produksi:

| Bagian | Kondisi |
|---|---|
| Tipe price-list pascabayar | Ada (`DigiflazzPascaPriceListItem`, `src/lib/digiflazz/price-list.ts`), **tidak pernah dipakai** |
| Sinkron katalog | Hanya prabayar — `const CMD = "prepaid"` di `src/jobs/catalog-sync.ts` |
| Kirim transaksi | `submitDigiflazzTransaction` tidak punya parameter `commands`, jadi tidak bisa `inq-pasca` / `pay-pasca` / `status-pasca` |
| Produk pascabayar di database produksi | **0** |
| Produk pascabayar di akun Digiflazz | **7**, semuanya aktif, satu kategori `Pascabayar`, empat brand — diperiksa 12 Sep 2026 (Bagian 4) |
| Menu "TAGIHAN" di aplikasi | Hanya berisi kategori `PLN` — itu **token prabayar**, bukan tagihan. Judulnya menyesatkan |
| Tabel `categories` & `brands` | Unik berdasarkan `name` saja (`004_products.sql`) |
| Halaman kategori | Mencari kategorinya lewat nama (`getCategoryPurchaseCatalog("PLN")`) |
| Aturan markup GLOBAL | Berlaku untuk **semua** produk tanpa kecuali (`listApplicableMarkupRules`) |
| Job cek status & tombol "Cek Status" admin | Sejak §5e (2026-09-11): jeda 60 detik per `ref_id`, job berhenti setelah 7 hari, semua jalur menolak di atas 85 hari (`evaluateProviderRecheck`) |

Baris kategori, halaman kategori, dan markup GLOBAL tidak terlihat
berbahaya hari ini, tapi masing-masing akan menjadi bug nyata begitu produk
pascabayar masuk (Bagian 7.9 dan 7.10).

---

## 3. Kenapa pascabayar tidak bisa "ditempel" ke alur prabayar

| | Prabayar (hari ini) | Pascabayar |
|---|---|---|
| Harga | Diketahui sebelum membeli | Baru diketahui setelah cek tagihan |
| Langkah ke Digiflazz | 1 (`/transaction`) | 2 (`inq-pasca`, lalu `pay-pasca`) |
| `ref_id` | Lahir saat membeli | Lahir saat **cek tagihan**, dipakai ulang saat bayar |
| Masa berlaku | — | Bayar hanya boleh di **tanggal yang sama** dengan cek tagihan |
| Cek status | Kirim ulang topup dengan `ref_id` sama | Perintah terpisah `status-pasca` dengan `ref_id` sama |
| Cek status > 90 hari | Membuat transaksi **BARU** | Dijawab "Data belum ada" |
| Pengaman harga | `max_price` | Tidak ada `max_price` di `pay-pasca` (menurut dokumentasi) |
| SKU cadangan (§5a) | Ya, otomatis | **Tidak mungkin** — tagihan terikat ke `ref_id` cek tagihan |
| Sumber keuntungan | Markup di atas harga modal | Komisi Digiflazz + biaya layanan Digides |
| Bentuk katalog | `price` tetap per SKU | `admin` + `commission`, tanpa harga |
| Nomor pelanggan | Satu nomor | PBB & SAMSAT: dua bagian digabung koma; E-Money: wajib `amount` |
| Rincian | `sn` | `desc` kaya dan berbeda per produk (periode, denda, meter, peserta…) |

---

## 4. Ruang lingkup

Pembagian gelombang di bawah adalah **usulan** berdasarkan apa yang paling
sering dibayar di loket desa. Pemilik produk bebas menggesernya.

### Gelombang 1 — seluruh isi akun Digiflazz hari ini

Diambil langsung dari `price-list cmd: "pasca"` pada 12 September 2026.
Ketujuhnya aktif, berada di satu kategori `Pascabayar`, dan semuanya memakai
satu nomor pelanggan tanpa format khusus:

| Produk | `buyer_sku_code` | Brand | Admin | Komisi |
|---|---|---|---|---|
| Pln Pascabayar | `plnpscabayar1` | PLN PASCABAYAR | 2.500 | 550 |
| SPEEDY & INDIHOME | `spd` | INTERNET PASCABAYAR | 2.500 | 1.175 |
| BIZNET HOME | `post736197` | INTERNET PASCABAYAR | 3.000 | 700 |
| BNETFIT | `post736198` | INTERNET PASCABAYAR | 5.000 | 2.440 |
| Telkomsel Omni | `post736190` | Telkomsel Omni | 1.000 | 800 |
| PDAM Aetra | `post739260` | PDAM | 3.500 | 1.240 |
| PDAM Batam | `post739261` | PDAM | 2.500 | 975 |

**Komisi itulah keuntungan Digides per transaksi** kalau mitra dibebani
persis `selling_price` saran Digiflazz, sebelum biaya layanan tambahan
(Bagian 7.10).

**Yang paling berguna untuk desa**: PLN Pascabayar dan internet. PDAM hanya
melayani Aetra (Jakarta) dan Batam — kemungkinan besar tidak terpakai di
wilayah mitra; sebaiknya disembunyikan dulu daripada membingungkan.

### Gelombang 2 — hanya kalau Digiflazz membukanya

**BPJS Kesehatan tidak ada di akun ini**, padahal ia yang paling sering
dibayar di loket desa. Begitu juga Multifinance, TV Pascabayar, Gas Negara,
PBB, SAMSAT, BPJSTK, dan PLN Nontaglis. Langkah pertama bukan menulis kode,
melainkan **meminta Digiflazz mengaktifkan produk-produk itu** untuk akun
ini. Kalau dibuka, hampir semuanya mewarisi alur yang sama; yang butuh
tambahan kerja hanya tampilan rincian per jenis (7.13).

### Gelombang 3 — butuh input khusus (kalau produknya dibuka)

- **PBB / Pajak Daerah** — `customer_no` = `"kode pembayaran,nomor identitas"`, `year` opsional
- **SAMSAT** — `customer_no` = `"kode bayar,nomor identitas"`
- **E-Money pascabayar** — `amount` wajib diisi
- BPJS Ketenagakerjaan (BPJSTK) dan Bukan Penerima Upah (BPJSTKPU)

### Sengaja di luar semua gelombang

- Bayar beberapa tagihan sekaligus dalam satu PIN
- Pengingat jatuh tempo
- Pembayaran sebagian (cicil tagihan)
- Membatalkan / mengembalikan tagihan yang sudah sukses — sama seperti
  prabayar, begitu Digiflazz menjawab Sukses, uangnya sudah sampai ke PLN

---

## 5. Alur

```
 MITRA                         SERVER DIGIDES                     DIGIFLAZZ
   │                                 │                                │
   │ pilih layanan, isi nomor        │                                │
   │ tekan "Cek Tagihan" ──────────▶ │ buat ref_id baru               │
   │                                 │ inq-pasca(ref_id) ───────────▶ │
   │                                 │ ◀──────────── rincian tagihan  │
   │                                 │ simpan bill_inquiries          │
   │                                 │ (harga DIKUNCI di sini)        │
   │ ◀────────── layar rincian       │                                │
   │   nama, periode, tagihan,       │  (belum ada RESERVE,           │
   │   denda, admin, total           │   belum ada baris transaksi)   │
   │                                 │                                │
   │ PIN ke-6 ─────────────────────▶ │ cek: belum kedaluwarsa,        │
   │                                 │      belum pernah dibayar,     │
   │                                 │      milik mitra ini           │
   │                                 │ transactions (key = ref_id)    │
   │                                 │ + RESERVE total, satu DB tx    │
   │                                 │ pay-pasca(ref_id SAMA) ──────▶ │
   │                                 │ ◀──── Sukses / Gagal / Pending │
   │                                 │ applyDigiflazzResult()         │
   │                                 │  (funnel yang sama persis)     │
   │ ◀────── Sukses / Gagal / Pending│                                │
   │                                 │                                │
   │ kalau Pending: polling 3s×20    │ ◀───── webhook                 │
   │ ke server KITA (tidak berubah)  │ status-pasca(ref_id SAMA) ───▶ │
   │                                 │ job 3 menit, jeda ≥ 60 detik   │
```

Mulai dari PIN ke bawah, alurnya adalah alur Bagian 1 dokumen terkunci,
tanpa perubahan bentuk. Yang baru hanya langkah **Cek Tagihan** di atasnya,
dan cara `settleWithProvider` / `checkTransactionStatus` berbicara ke
Digiflazz.

Polling 3 detik × 20 dari aplikasi tidak menyentuh aturan 1 menit Digiflazz:
aplikasi bertanya ke server Digides, bukan ke Digiflazz.

---

## 6. Perubahan skema (migrasi 057)

### 6.1 `products`, `categories`, `brands` — jenis produk

```sql
ALTER TABLE categories ADD COLUMN product_type text NOT NULL DEFAULT 'PREPAID'
  CHECK (product_type IN ('PREPAID', 'POSTPAID'));
ALTER TABLE brands     ADD COLUMN product_type text NOT NULL DEFAULT 'PREPAID'
  CHECK (product_type IN ('PREPAID', 'POSTPAID'));
ALTER TABLE products   ADD COLUMN product_type text NOT NULL DEFAULT 'PREPAID'
  CHECK (product_type IN ('PREPAID', 'POSTPAID'));

-- nama unik PER JENIS, bukan global (alasan: Bagian 7.9)
ALTER TABLE categories DROP CONSTRAINT categories_name_key;
ALTER TABLE categories ADD CONSTRAINT categories_name_type_key UNIQUE (name, product_type);
ALTER TABLE brands     DROP CONSTRAINT brands_name_key;
ALTER TABLE brands     ADD CONSTRAINT brands_name_type_key UNIQUE (name, product_type);

-- dari price-list pascabayar; NULL untuk prabayar
ALTER TABLE products ADD COLUMN admin_fee numeric(14, 0);
ALTER TABLE products ADD COLUMN provider_commission numeric(14, 0);
```

Semua baris yang sudah ada otomatis `PREPAID` — tidak ada backfill, tidak
ada perilaku prabayar yang berubah. Produk pascabayar menyimpan
`base_price = 0` (tidak bermakna di katalog; harga sebenarnya baru ada di
cek tagihan).

> Nama constraint `categories_name_key` / `brands_name_key` adalah nama
> bawaan Postgres; pastikan dengan `\d categories` sebelum menulis migrasi.

### 6.2 `bill_inquiries` — hasil cek tagihan

```sql
CREATE TABLE bill_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text NOT NULL UNIQUE,              -- kelak menjadi transactions.idempotency_key
  user_id uuid NOT NULL REFERENCES users(id),
  wallet_id uuid NOT NULL REFERENCES wallets(id),
  product_id uuid NOT NULL REFERENCES products(id),

  buyer_sku_code text NOT NULL,             -- snapshot; dipakai lagi oleh pay-pasca & status-pasca
  customer_no text NOT NULL,                -- persis yang dikirim ke Digiflazz
  input_parts jsonb,                        -- PBB/SAMSAT: {kode_bayar, nomor_identitas}
  extra_params jsonb,                       -- {year} untuk PBB, {amount} untuk E-Money

  status text NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
  rc text,
  message text,

  customer_name text,
  periode text,
  bill_sheets integer,                      -- desc.lembar_tagihan
  admin_fee numeric(14, 0),                 -- respons.admin
  provider_price numeric(14, 0),            -- respons.price  → calon base_price
  provider_selling_price numeric(14, 0),    -- respons.selling_price
  service_fee numeric(14, 0),               -- biaya layanan Digides, snapshot
  total_amount numeric(14, 0),              -- yang akan dibayar mitra → calon selling_price
  bill_desc jsonb,                          -- respons.desc apa adanya
  raw_response jsonb NOT NULL,

  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bill_inquiries_user_created ON bill_inquiries (user_id, created_at DESC);
```

Seluruh baris **append-only** (trigger `forbid_mutation()` seperti tabel
keuangan lain): hasil cek tagihan adalah bukti apa yang dilihat mitra
sebelum membayar, dan bukti tidak boleh bisa diubah. Karena itu tidak ada
kolom "sudah dipakai" di sini — "sudah dibayar" dijawab oleh transaksi
(6.3).

`buyer_sku_code` disimpan sebagai snapshot, bukan dibaca ulang dari
`products.sku` saat membayar: `status-pasca` wajib memakai kode produk yang
sama dengan `pay-pasca`, dan SKU di katalog bisa berubah di antara keduanya.

### 6.3 `transactions` — tautan ke cek tagihan

```sql
ALTER TABLE transactions
  ADD COLUMN bill_inquiry_id uuid UNIQUE REFERENCES bill_inquiries(id) ON DELETE RESTRICT;
```

`UNIQUE` = satu cek tagihan paling banyak menghasilkan satu transaksi.
Ini pagar kedua di samping `idempotency_key` (Bagian 7.2). `RESTRICT`, bukan
`SET NULL` — pelajaran dari migrasi 056.

### 6.4 Tipe ledger

**Tidak ada tipe ledger baru.** Pembayaran tagihan memakai RESERVE / DEBIT /
RELEASE yang sudah ada. Artinya 17 titik klasifikasi ledger (pelajaran
pahit dari `CASHBACK`) tidak perlu disentuh sama sekali.

---

## 7. Keputusan desain

### 7.1 Cek tagihan bukan transaksi

Cek tagihan tidak membuat baris `transactions` dan tidak me-RESERVE saldo.

Kebanyakan cek tagihan tidak berakhir dibayar — pelanggan kaget melihat
dendanya, uangnya kurang, atau nomornya salah. Kalau setiap cek tagihan
me-RESERVE, buku besar akan penuh pasangan RESERVE/RELEASE yang tidak
pernah menjadi apa-apa, dan laporan "transaksi gagal" jadi tidak berarti.

Konsekuensinya: mitra bisa melihat tagihan Rp500.000 walau saldonya
Rp100.000. Itu benar — layar rincian menampilkan "Saldo tidak cukup" dan
tombol Bayar nonaktif, tapi rinciannya tetap berguna (pelanggan tahu berapa
yang harus disiapkan).

### 7.2 `ref_id` lahir saat cek tagihan, dan itulah kunci idempotensinya

Server membuat `ref_id` saat cek tagihan. Saat membayar, server — **bukan
klien** — memakai `bill_inquiries.ref_id` sebagai
`transactions.idempotency_key`.

Hasilnya, PIN yang tertekan dua kali, jaringan yang putus lalu diulang,
atau dua tab yang membayar tagihan yang sama, semuanya jatuh ke kunci yang
sama. Mekanisme `ON CONFLICT` §5b yang sudah terbukti langsung menangkapnya:
tidak ada pembayaran kedua, tanpa kode idempotensi baru.

`idempotencyKey` yang dikirim klien untuk pembayaran tagihan diabaikan.

### 7.3 Harga dikunci saat cek tagihan

Yang di-RESERVE adalah `bill_inquiries.total_amount` — angka yang persis
tampil di layar mitra. Tidak ada `getLiveProductPricing` kedua saat PIN
ditekan: harga tagihan tidak ada di price-list, dan menghitung ulang biaya
layanan di antara layar dan PIN bisa membuat mitra membayar angka yang
tidak pernah ia lihat.

Kalau aturan biaya layanan diubah admin di antara cek tagihan dan bayar,
yang berlaku tetap angka saat cek tagihan.

### 7.4 Masa berlaku cek tagihan

`expires_at` = yang **lebih dulu** dari:

1. akhir tanggal yang sama (aturan Digiflazz: bayar hanya di tanggal yang
   sama dengan cek tagihan), dan
2. **30 menit** setelah cek tagihan (usulan Digides).

Batas 30 menit bukan aturan Digiflazz. Alasannya: tagihan bisa saja dibayar
di loket lain, atau denda bertambah, di antara pagi dan sore. Cek tagihan
yang basi lebih baik diulang (gratis dan cepat) daripada dibayar.

Setelah kedaluwarsa, tombol Bayar berubah menjadi "Cek Ulang Tagihan", yang
membuat cek tagihan **baru** dengan `ref_id` baru.

> ⚠ VERIFIKASI: "tanggal yang sama" menurut zona waktu apa? Diasumsikan
> WIB sampai dipastikan. Juga: apakah cek tagihan dikenai biaya untuk
> produk tertentu?

### 7.5 Tidak ada SKU cadangan untuk tagihan

`trySwapToBackupSku` harus langsung mengembalikan "tidak ada cadangan" untuk
produk `POSTPAID`.

SKU cadangan bekerja dengan mengganti `idempotency_key`. Untuk tagihan,
`ref_id` itu adalah satu-satunya tautan ke hasil cek tagihan di sisi
Digiflazz — seller lain tidak mengenalnya, dan nilai tagihannya di seller
lain belum tentu sama. Mengganti SKU berarti cek tagihan baru, harga baru,
dan persetujuan mitra yang baru — bukan sesuatu yang boleh terjadi diam-diam.

`pay-pasca` Gagal → `releaseTransaction`, saldo kembali, mitra bisa cek
ulang tagihan sendiri.

### 7.6 Cek status memakai `status-pasca`, tidak pernah mengirim ulang `pay-pasca`

**Terkonfirmasi dokumentasi Digiflazz (Cek Status → Postpaid):** status
pembayaran tagihan dicek dengan perintah `status-pasca`, `ref_id` yang sama,
dan signature yang sama `md5(username + apiKey + ref_id)`:

```json
{
  "commands": "status-pasca",
  "username": "username",
  "buyer_sku_code": "pln",
  "customer_no": "530000000003",
  "ref_id": "some1d",
  "sign": "740b00a1b8784e028cc8078edf66d12b"
}
```

Aturan terkunci #3 ("kirim ulang dengan `ref_id` sama = cek status") hanya
berlaku untuk prabayar. Untuk `POSTPAID`:

- `checkTransactionStatus` — dipanggil job 3 menit maupun tombol "Cek Status"
  admin — memanggil `checkPostpaidStatus` (`status-pasca`) setelah lolos
  pagar §5e yang sudah ada.
- `payPostpaidBill` (`pay-pasca`) hanya punya **satu** pemanggil: pembayaran
  pertama. Tidak ada jalur mana pun yang memanggilnya untuk transaksi yang
  sudah RESERVED — termasuk `executeTransaction` yang diulang.
- `buyer_sku_code` dan `customer_no` diambil dari `bill_inquiries` — persis
  yang dikirim saat `pay-pasca`, termasuk string gabungan berkoma untuk
  PBB/SAMSAT — bukan dari input ulang atau katalog.
- Jawaban `status-pasca` (Sukses / Gagal / Pending) masuk ke
  `applyDigiflazzResult` yang sama, seperti jawaban lain.

**"Data belum ada" bukan Gagal.** Menurut dokumentasi, Digiflazz menjawab
begitu untuk cek status transaksi pascabayar yang lewat 90 hari. Jawaban
yang sama sangat mungkin juga muncul kalau `pay-pasca` kita tidak pernah
sampai ke Digiflazz (jaringan putus sebelum permintaan terkirim), dan dari
sisi Digides kedua keadaan itu tidak bisa dibedakan dengan pasti. Kalau
jawaban itu dianggap Gagal lalu saldo mitra dilepas, padahal pembayarannya
ternyata tercatat di Digiflazz, Digides membayar tagihan orang dengan
uangnya sendiri. Jadi:

- transaksi tetap RESERVED, jawabannya dicatat sebagai event;
- transaksi ditandai "perlu penanganan manual" di Transaksi Tertahan;
- saldo **tidak pernah** dilepas otomatis karena jawaban ini.

**Batas umur** mengikuti §5e yang sudah berjalan: job berhenti mengecek
otomatis setelah 7 hari, dan semua jalur menolak di atas 85 hari. Alasan
batas 85 hari untuk pascabayar berbeda (di atas 90 hari jawabannya hanya
"Data belum ada", bukan pembelian baru), jadi **pesan penolakannya perlu
dibedakan** untuk `POSTPAID` — pesan hari ini menyebut "membuat pembelian
baru", yang benar hanya untuk prabayar.

> ⚠ VERIFIKASI: bentuk persis respons "Data belum ada" (`status` dan `rc`)
> — supaya dikenali dari rc, bukan dari mencocokkan teks pesan. Dan apakah
> webhook Digiflazz juga dikirim untuk transaksi pascabayar dengan bentuk
> `data` yang sama; kalau tidak, job tetap menutupnya, hanya lebih lambat.

### 7.7 Tidak ada `max_price` — pengamannya di sisi Digides

Parameter `pay-pasca` yang terdokumentasi tidak memuat `max_price`. Jadi
tidak ada yang mencegah Digiflazz memotong deposit lebih besar dari
`provider_price` saat cek tagihan.

Pengaman:

1. Masa berlaku pendek (7.4) memperkecil peluang harga bergeser.
2. Saat `pay-pasca` Sukses, `price` pada respons dibandingkan dengan
   `bill_inquiries.provider_price`. Kalau lebih besar:
   - `transactions.base_price` diperbarui ke `price` yang **sebenarnya**
     sebelum komisi dan cashback dihitung — supaya keduanya dibatasi oleh
     margin yang benar-benar ada, bukan margin di atas kertas;
   - dicatat sebagai `transaction_events` (`POSTPAID_PRICE_MISMATCH`)
     berisi kedua angka;
   - ditampilkan menonjol di Detail Transaksi Super Admin.
3. Mitra tetap membayar `total_amount` yang ia setujui. Selisihnya ditanggung
   margin Digides. Kalau selisihnya melebihi margin, transaksi itu rugi —
   dan kejadian itu terlihat, bukan tersembunyi.

Transaksinya tetap SUCCESS: tagihannya sudah lunas di PLN, tidak ada yang
bisa dibatalkan.

### 7.8 Margin didefinisikan sama seperti prabayar

Untuk transaksi `POSTPAID`:

- `transactions.selling_price` = `total_amount` (yang dibayar mitra)
- `transactions.base_price` = `price` dari Digiflazz (yang dipotong dari deposit)

Dengan dua kolom ini diisi begitu, `awardCommissionForTransaction` dan
`awardCashbackForTransaction` bekerja **tanpa diubah**: keduanya sudah
membatasi diri pada `selling_price − base_price`, dan cashback sudah
membatasi diri pada sisa margin setelah komisi. Laporan Keuntungan juga
langsung benar.

Yang perlu diperhatikan: aturan cashback atau komisi **GLOBAL** yang sudah
aktif akan ikut berlaku untuk tagihan. Itu aman secara uang (dibatasi
margin), tapi perlu diketahui admin sebelum Tahap 3 dirilis.

### 7.9 Kategori dan brand pascabayar dipisah dari prabayar

Ini temuan dari kode, bukan dugaan: sinkron katalog memanggil
`upsertCategory(item.category)` dengan nama saja
(`src/jobs/catalog-sync.ts:85`), dan `categories.name` unik global.

**Diperiksa 12 September 2026: hari ini belum ada tabrakan.** Seluruh produk
pascabayar berada di kategori `Pascabayar`, dengan brand `PLN PASCABAYAR`,
`INTERNET PASCABAYAR`, `PDAM`, dan `Telkomsel Omni` — tidak satu pun bentrok
dengan 19 kategori dan 19 brand prabayar yang ada.

Pemisahan tetap dikerjakan, dengan tiga alasan yang tidak bergantung pada
nama:

1. **Produk pascabayar tidak punya harga** (`base_price = 0`). Kalau ia ikut
   terbaca jalur prabayar mana pun, mitra bisa melihat produk berharga nol.
2. **Aturan markup GLOBAL** hari ini berlaku ke semua produk (7.10).
3. **Nama itu milik Digiflazz, bukan milik kita.** Mereka bisa mengubah
   `Pascabayar` menjadi `PLN` atau `TV` kapan saja, dan tabrakannya baru
   ketahuan setelah produk bercampur di layar mitra.

Kalau nanti tabrakan itu terjadi tanpa pemisahan, akibatnya:

- produk itu muncul di grid token PLN mitra;
- aturan markup/komisi/cashback kategori PLN prabayar ikut berlaku ke tagihan;
- pengelompokan SKU cadangan bisa salah mencampur.

Karena itu `product_type` ditambahkan ke `categories` dan `brands`, keunikan
nama menjadi per jenis (6.1), dan setiap pencarian kategori berdasarkan nama
yang sudah ada (mis. `getCategoryPurchaseCatalog`) wajib menambahkan
`product_type = 'PREPAID'` secara eksplisit. Daftar lengkap pemanggilnya
diinventarisasi di Tahap 1 sebelum migrasi dijalankan.

> ⚠ VERIFIKASI: nama `category` dan `brand` sebenarnya di price-list
> pascabayar. Pemisahan ini tetap diperlukan apa pun hasilnya — kalaupun
> hari ini namanya kebetulan tidak bertabrakan, Digiflazz bisa
> mengubahnya kapan saja.

### 7.10 Biaya layanan memakai `markup_rules`, tapi GLOBAL tidak berlaku

Biaya layanan Digides untuk tagihan memakai tabel `markup_rules` yang sudah
ada, dengan cakupan CATEGORY / BRAND / PRODUCT pada kategori pascabayar.

Satu pengecualian: **aturan GLOBAL tidak berlaku untuk produk `POSTPAID`.**
`listApplicableMarkupRules` hari ini selalu menyertakan GLOBAL. Markup
global yang dirancang untuk pulsa Rp5.000 tidak boleh diam-diam menempel ke
tagihan Rp300.000 — biaya layanan tagihan adalah keputusan sadar per
kategori. Tanpa aturan, biaya layanan = Rp0 dan margin Digides hanya komisi
Digiflazz.

Hanya nilai nominal. `getEffectiveMarkupValue` hari ini menjumlahkan
`markup_value` sebagai rupiah apa pun `markup_type`-nya, jadi
formulir biaya layanan pascabayar hanya menawarkan NOMINAL.

### 7.11 Sinkron katalog pascabayar berjalan terpisah dan jarang

- Fungsi sinkron sendiri dengan `cmd: "pasca"`, bukan cabang di dalam
  sinkron prabayar — kegagalan salah satunya tidak menghentikan yang lain.
- **Dipicu manual** dari halaman Produk lewat tombol "Sinkronkan Pascabayar",
  sama seperti sinkron prabayar — yang ternyata juga tidak terjadwal.
  Jendela tunggu 5 menit Digiflazz sengaja dibagi dengan sinkron prabayar,
  karena batas itu berlaku per akun, bukan per jenis daftar harga.
  Penjadwalan otomatis bisa ditambahkan nanti kalau katalognya mulai sering
  berubah; hari ini isinya hanya 7 produk.
- Tercatat di `catalog_sync_logs` yang sama, dengan penanda jenis.
- Status produk mengikuti `buyer_product_status` per item, sama seperti
  prabayar. Catatan: sinkron prabayar hari ini **tidak** menandai produk
  yang hilang sama sekali dari price-list (sudah diperiksa di kode). Untuk
  pascabayar itu tidak cukup, karena produk hantu bisa tetap dicek
  tagihannya: produk `POSTPAID` yang tidak muncul di price-list terbaru
  diubah menjadi `DISABLED`, tidak pernah dihapus.
- Tidak ada pengecekan harga live per SKU sebelum cek tagihan: `inq-pasca`
  itu sendiri adalah pengecekan live, dan akan menjawab Gagal kalau produk
  sedang gangguan.

### 7.12 Format nomor khusus disusun di server

Aplikasi mengirim bagian-bagiannya secara terpisah, dan server yang
menggabungkan:

| Produk | Input di aplikasi | Dikirim ke Digiflazz |
|---|---|---|
| PBB / Pajak Daerah | Kode Pembayaran, Nomor Identitas, Tahun (opsional) | `customer_no: "kode,nomor"`, `year` |
| SAMSAT | Kode Bayar, Nomor Identitas | `customer_no: "kode,nomor"` |
| E-Money pascabayar | Nomor, Nominal | `customer_no`, `amount` |

Server menolak bagian yang mengandung koma — koma adalah pemisah, dan satu
koma yang tidak semestinya mengubah arti nomor.

### 7.13 Rincian tagihan: whitelist, bukan dump

Setiap jenis produk punya daftar field `desc` yang ditampilkan, dengan label
bahasa Indonesia dan urutan tetap. Field yang tidak dikenal tidak
ditampilkan ke mitra (tetap tersimpan utuh di `bill_desc`).

| Jenis | Ditampilkan |
|---|---|
| PLN | Tarif/Daya, Lembar Tagihan, per periode: Nilai Tagihan, Denda, Admin |
| PDAM | Alamat, Jatuh Tempo, per periode: Meter Awal–Akhir, Biaya Lain, Denda |
| Internet / HP / TV | Per periode: Nilai Tagihan, Admin (TV: No. Ref) |
| BPJS Kesehatan | Jumlah Peserta, Alamat, Periode |
| Multifinance | Nama Barang, No. Polisi, No. Rangka, Tenor, Denda, Biaya Lain |
| PBB / Pajak Daerah | Tahun Pajak, Kelurahan, Kecamatan, Kab/Kota, Luas Tanah, Luas Bangunan |
| Gas Negara | Alamat, Meter Awal–Akhir, Pemakaian |
| BPJSTK / BPJSTKPU | Program, JKK, JKM, JHT (+JPK, JPN), Kantor Cabang, Masa Berlaku |
| PLN Nontaglis | Jenis Transaksi, No. Registrasi, Tanggal Registrasi |
| SAMSAT | Nomor Polisi, Merek, rincian biaya pokok & denda |

Dua aturan tampilan yang berlaku untuk semua jenis:

1. **Nama pelanggan selalu paling atas dan paling besar.** Salah bayar
   tagihan tetangga adalah kesalahan paling mahal di loket, dan nama adalah
   satu-satunya yang bisa dicocokkan pelanggan dengan mata.
2. **Denda tidak pernah disembunyikan** di balik "rincian lainnya" — ia
   selalu tampil kalau nilainya lebih dari 0.

### 7.14 Struk

Struk tagihan adalah bukti bayar yang ditunjukkan pelanggan kalau listriknya
tetap diputus. Minimal berisi: nama toko/mitra, nama pelanggan, nomor/ID
pelanggan, layanan, periode, lembar tagihan, nilai tagihan, denda, admin +
biaya layanan, total, nomor referensi (`sn`), dan waktu bayar.

### 7.15 Batas cek tagihan

Cek tagihan murah untuk mitra, tapi Digiflazz membatasi (rc 86 "limitasi
cek nomor PLN" sudah disebut di dokumen terkunci), dan meminta panggilan
untuk data yang sama tidak diulang dalam < 1 menit (7.17). Aturannya:

- Cek ulang untuk **produk + nomor yang sama** dalam 60 detik mengembalikan
  hasil cek tagihan sebelumnya (kalau masih berlaku), tanpa memanggil
  Digiflazz lagi.
- Maksimal 10 cek tagihan per mitra per menit.

### 7.16 Menu "TAGIHAN" ditata ulang

Hari ini "TAGIHAN — Bayar tagihan bulanan dengan mudah" hanya berisi token
PLN prabayar. Di web dan Flutter:

- Token PLN pindah ke grup yang jujur namanya (mis. bersama pulsa/data, atau
  grup "LISTRIK" sendiri).
- "TAGIHAN" berisi layanan pascabayar yang aktif.

Perubahan ini murni tampilan (Bagian 6 dokumen terkunci) dan boleh dirilis
bersamaan dengan Gelombang 1.

### 7.17 Jarak minimal 1 menit untuk `ref_id` yang sama — sudah ada (§5e)

Dokumentasi Digiflazz (Cek Status): *"pemanggilan API untuk transaksi/data
yang sama tidak dilakukan berulang dalam interval kurang dari 1 (satu)
menit. Pemanggilan berulang dalam rentang waktu tersebut dapat menimbulkan
race condition atau duplikasi proses. Segala risiko yang timbul dari kondisi
tersebut berada di luar tanggung jawab kami."*

Untuk tagihan, "duplikasi proses" berarti tagihan terbayar dua kali. Aturan
ini **sudah menjadi pagar di kode** sejak amandemen §5e (2026-09-11), dibuat
untuk prabayar setelah audit produksi menemukan 7 dari 53 transaksi pertama
dipanggil ulang kurang dari 60 detik (6 oleh job, 3–50 detik setelah submit;
1 oleh 5 klik "Cek Status" dalam 89 detik). Tidak ada kerugian — deposit
tidak terpotong dua kali — tapi Digiflazz sudah lepas tangan.

Yang berarti untuk pascabayar:

1. **Tidak perlu kode jeda baru.** `evaluateProviderRecheck` sudah menjaga
   setiap jalur yang mengirim ulang `ref_id` yang sama — `checkTransactionStatus`
   (job dan tombol admin) dan `executeTransaction` yang diulang. Selama
   `status-pasca` hanya dipanggil dari dalam `checkTransactionStatus`
   setelah pagar itu, ia otomatis patuh.
2. "Kontak terakhir" dihitung dari `transactions.created_at` dan event
   terbaru. Karena RESERVE pembayaran tagihan ditulis tepat sebelum
   `pay-pasca`, hitungan itu langsung benar untuk tagihan tanpa perubahan.
3. Cek tagihan ulang untuk produk + nomor yang sama sudah dibatasi 60 detik
   (7.15) — itu satu-satunya pagar jeda yang baru.
4. `inq-pasca` lalu `pay-pasca` untuk `ref_id` yang sama wajar terjadi
   dalam < 1 menit (mitra membaca rincian lalu menekan PIN). Itu alur yang
   didokumentasikan Digiflazz sendiri, dengan dua perintah berbeda, jadi
   **tidak** ditahan — menahan mitra 60 detik sebelum boleh membayar adalah
   pengalaman yang buruk.
   > ⚠ VERIFIKASI: konfirmasi ke CS Digiflazz bahwa jeda `inq-pasca` →
   > `pay-pasca` di bawah 1 menit tidak termasuk yang dimaksud peringatan ini.

---

## 8. Sentuhan pada kode yang sudah jalan

| File | Perubahan | Terkunci? |
|---|---|---|
| `src/lib/digiflazz/postpaid.ts` (baru) | `inquirePostpaidBill` (`inq-pasca`), `payPostpaidBill` (`pay-pasca`), `checkPostpaidStatus` (`status-pasca`) | Baru — tapi berbicara ke Digiflazz |
| `src/lib/digiflazz/transaction.ts` | **Tidak diubah.** Fungsi pascabayar dibuat berdampingan, tidak menambah cabang ke fungsi prabayar | — |
| `src/services/transaction.service.ts` | `settleWithProvider` memilih fungsi berdasarkan `product_type`; `checkTransactionStatus` memanggil `status-pasca` untuk POSTPAID (pagar jeda & umur §5e sudah ada, hanya pesan 85 hari yang dibedakan); `trySwapToBackupSku` menolak `POSTPAID`; capture memperbarui `base_price` (7.7) | **Ya** |
| `src/services/postpaid.service.ts` (baru) | Cek tagihan, validasi masa berlaku, pembentukan `executePostpaidPayment` yang lalu memanggil mesin yang sama | Memanggil jalur terkunci |
| `src/jobs/catalog-sync.ts` | Sinkron pascabayar terpisah; `upsertCategory`/`upsertBrand` menerima jenis | Tidak |
| `src/repositories/product.repository.ts` | `upsertCategory`/`upsertBrand` per jenis; `listApplicableMarkupRules` mengecualikan GLOBAL untuk POSTPAID | Tidak (harga, bukan transaksi) |
| `src/services/catalog.service.ts` | Pencarian kategori prabayar difilter `PREPAID` | Tidak |
| `src/jobs/pending-transaction-check.ts` | **Tidak diubah** — sejak §5e hanya memilih transaksi yang sudah lewat jeda 60 detik dan berumur < 7 hari | — |
| API baru | `POST /api/postpaid/inquiries`, `GET /api/postpaid/inquiries/[id]`, `POST /api/postpaid/payments` | Tidak |
| Web | Halaman Bayar Tagihan per peran, layar rincian, struk | Tidak |
| Flutter | Layar Bayar Tagihan, rincian, struk; menu TAGIHAN | Tidak |

---

## 9. Amandemen dokumen terkunci yang dibutuhkan

Diusulkan sebagai **§5f** di `FLOW_KERJA_DAN_BATASAN_KERJA_TRANSAKSI.md`.
**Belum ditulis, dan tidak akan ditulis tanpa persetujuan eksplisit.**

**Yang berubah:**

| Aturan | Perubahan |
|---|---|
| #2 Pengiriman ke Digiflazz | Ditambah jalur kedua yang sejajar untuk pascabayar (`inq-pasca` / `pay-pasca` / `status-pasca`), dengan formula signature yang sama |
| #3 Idempotensi | Untuk `POSTPAID`, `ref_id` lahir di `bill_inquiries`, bukan di klien; tetap satu `ref_id` per niat bayar, tetap tidak pernah dibuat ulang |
| #3 "kirim ulang = cek status" | **Tidak berlaku untuk `pay-pasca`**; cek status memakai `status-pasca` (terkonfirmasi dokumentasi), lewat pagar §5e yang sama |
| Pelepasan saldo | Jawaban "Data belum ada" dari `status-pasca` tidak pernah memicu `releaseTransaction` (7.6) |
| #8 & §5a SKU cadangan | Tidak berlaku untuk `POSTPAID` (7.5) |
| Capture | Untuk `POSTPAID`, `base_price` diperbarui ke `price` sebenarnya sebelum komisi/cashback (7.7) |

**Sudah diatur §5e, tidak perlu diamandemen lagi:** jeda 60 detik per
`ref_id`, job berhenti setelah 7 hari, penolakan di atas 85 hari.

**Yang sengaja tidak berubah:** funnel tunggal `applyDigiflazzResult`,
compare-and-swap status, RESERVE/DEBIT/RELEASE di dalam `withTransaction`,
verifikasi signature webhook, polling 3 detik × 20, interval job 3 menit,
pendanaan dari saldo utama (§5d), dan tidak ada state machine baru (§8.1).

---

## 10. Kriteria penerimaan

**Katalog**
- [ ] Sinkron pascabayar mengisi produk `POSTPAID` dengan `admin_fee` dan `provider_commission`.
- [ ] Tidak satu pun produk pascabayar muncul di halaman kategori prabayar (diuji pada nama kategori yang sengaja dibuat sama).
- [ ] Sinkron prabayar menghasilkan jumlah produk yang sama persis sebelum dan sesudah migrasi 057.

**Cek tagihan**
- [ ] Nama pelanggan, periode, denda, admin, dan total tampil sesuai respons.
- [ ] Cek tagihan tidak menulis satu baris pun di `transactions` atau `wallet_ledger`.
- [ ] Cek tagihan gagal (nomor salah, sudah lunas) menampilkan pesan yang bisa dipahami, bukan rc mentah.
- [ ] Format PBB, SAMSAT, dan E-Money terkirim persis sesuai dokumentasi.
- [ ] Cek ulang produk + nomor yang sama dalam 60 detik tidak memanggil Digiflazz.

**Pembayaran — diuji lewat mesin sungguhan (`npx tsx`), memeriksa SALDO dompet**
- [ ] Sukses: saldo berkurang tepat `total_amount`, sekali.
- [ ] Gagal: saldo kembali utuh; tidak ada percobaan SKU cadangan.
- [ ] Pending lalu Sukses lewat `status-pasca`: satu RESERVE, satu DEBIT.
- [ ] PIN dua kali / dua permintaan bersamaan untuk cek tagihan yang sama: satu transaksi, satu `pay-pasca`.
- [ ] Cek tagihan kedaluwarsa atau milik mitra lain: ditolak sebelum RESERVE.
- [ ] `price` pembayaran > `provider_price` cek tagihan: `base_price` terbarui, event tercatat, komisi & cashback dibatasi margin sebenarnya.
- [ ] Tidak ada jalur cek status (job, tombol admin, maupun `executeTransaction` yang diulang) yang memanggil `pay-pasca`.
- [ ] Pagar §5e juga menahan `status-pasca`: tidak terkirim < 60 detik setelah `pay-pasca` atau cek sebelumnya — diuji dengan menjalankan job tepat setelah `pay-pasca`, dan dengan menekan "Cek Status" dua kali.
- [ ] Jawaban "Data belum ada" tidak melepas saldo; transaksi tetap RESERVED dan ditandai perlu penanganan manual.
- [ ] Pesan penolakan 85 hari untuk `POSTPAID` tidak menyebut "pembelian baru".
- [ ] `verifyLedgerConsistency` bersih setelah semua skenario di atas.

**Tampilan**
- [ ] Struk memuat semua field di 7.14.
- [ ] Menu TAGIHAN tidak lagi berisi token prabayar.

---

## 11. Urutan pengerjaan

### Tahap 0 — Verifikasi (tanpa kode produksi)

1. Dokumentasi:
   - ✅ Cek status pascabayar (`status-pasca`) — diterima 11 September 2026.
   - ⬜ Sisa respons `pay-pasca` BPJSTKPU.
   - ⬜ Daftar rc, termasuk rc untuk "Data belum ada".
   - ⬜ Test case pascabayar untuk mode development.
2. ✅ **Selesai 12 September 2026.** Price-list `cmd: "pasca"` diambil dari
   server (baca saja, di luar jendela sinkron prabayar — sinkron terakhir
   9 September). Hasil: 7 produk aktif, satu kategori `Pascabayar`, empat
   brand, admin 1.000–5.000, komisi 550–2.440. Rincian di Bagian 4.
3. ⬜ Satu cek tagihan sungguhan (`inq-pasca`) untuk memastikan arti `price`
   vs `selling_price` (Bagian 1). **Akun ini mode `production`, jadi flag
   `testing` tidak berlaku** — perlu satu ID pelanggan PLN pascabayar yang
   nyata dari pemilik produk. Cek tagihan tidak menarik uang; pembayaran
   baru terjadi pada `pay-pasca`.
4. Pastikan: zona waktu "tanggal yang sama", biaya cek tagihan, apakah
   webhook dikirim untuk pascabayar, dan jeda `inq-pasca` → `pay-pasca`
   (7.17 butir 4).

Hasil Tahap 0 dicatat sebagai revisi dokumen ini **sebelum** Tahap 1.

### Tahap 1 — Pemisahan katalog (tidak terlihat mitra) — ✅ **selesai 12 September 2026, belum dideploy**

Migrasi 057 (kolom `product_type` di produk/kategori/brand, keunikan nama per
jenis, kolom `admin_fee` dan `provider_commission`), sinkron pascabayar
terpisah, dan pengecualian markup GLOBAL.

Keputusan pelaksanaan yang berbeda dari rencana awal: penyaring jenis
dipasang **satu kali** di `buildProductFilterConditions`, sehingga setiap
kueri produk yang tidak menyebut jenis hanya melihat prabayar — bukan
ditambahkan satu per satu di tiap pemanggil, pola yang dulu membuat tipe
ledger `CASHBACK` terlewat di satu titik. `upsertCategory`, `upsertBrand`,
dan `upsertProduct` mewajibkan jenis disebut, jadi pemeriksa tipe yang
menunjuk pemanggil yang belum menyesuaikan.

Diuji di database lokal tanpa satu pun panggilan Digiflazz — **12/12 lulus**:
katalog mitra dan daftar bawaan tidak memuat produk pascabayar sementara
daftar "semua jenis" memuatnya (bukti penyaringnya yang bekerja, bukan
datanya kosong), markup GLOBAL tidak menempel ke pascabayar tapi tetap
berlaku untuk prabayar, SKU cadangan tidak pernah memilih produk
pascabayar, produk yang hilang dari daftar dinonaktifkan, dan jumlah produk
prabayar tidak berubah sama sekali. `tsc --noEmit` bersih.

Uji itu juga menangkap satu bug nyata sebelum sampai ke produksi: kueri
markup sudah memakai parameter jenis tapi daftar parameternya belum — hal
yang tidak bisa dilihat pemeriksa tipe, hanya oleh database saat dijalankan.

> **Status pengerjaan 12 September 2026.** Tahap 1 selesai dan sudah
> dideploy. Tahap 2, 3, dan 5 **kodenya selesai, terpasang di produksi, dan
> menunggu pengujian di mode development Digiflazz** — amandemen §5f sudah
> ditulis atas izin eksplisit pemilik produk. Tahap 4 (layar web) belum
> dikerjakan: aplikasi mitra memakai API yang sama, jadi ia tidak
> menghalangi pengujian.

### Tahap 2 — Cek tagihan (tanpa uang)

`bill_inquiries`, `inquirePostpaidBill`, API cek tagihan, penyusun format
khusus, batas cek tagihan. Bisa dirilis ke produksi dengan menu disembunyikan
untuk diuji admin. Selesai = kriteria **Cek tagihan** lulus.

**Persetujuan amandemen Bagian 9 diminta di akhir tahap ini**, dengan hasil
Tahap 0–2 sebagai bahan pertimbangan.

### Tahap 3 — Pembayaran (uang bergerak)

Hanya setelah amandemen disetujui dan §5f ditulis. `payPostpaidBill`,
`checkPostpaidStatus`, cabang di `settleWithProvider` dan
`checkTransactionStatus`, penolakan SKU cadangan, pembaruan `base_price`.
Selesai = seluruh kriteria **Pembayaran** lulus lewat uji ujung-ke-ujung pada
mesin sungguhan, lalu satu pembayaran PLN pascabayar nyata di produksi dengan
nominal kecil, dicocokkan dengan mutasi deposit Digiflazz.

### Tahap 4 — Web

Halaman Bayar Tagihan, layar rincian per jenis (7.13), struk, dan
pengaturan biaya layanan pascabayar di Super Admin.

### Tahap 5 — Flutter

Layar yang sama, menu TAGIHAN ditata ulang, panduan pengguna diperbarui
(bagian "tagihan" di panduan hari ini merujuk ke token).

### Tahap 6 — Gelombang 2 dan 3

Gelombang 2 hampir tanpa kode baru (hanya renderer rincian). Gelombang 3
membawa form input khusus.

---

## 12. Risiko

| Risiko | Dampak | Penanganan |
|---|---|---|
| Arti `price`/`selling_price` ternyata berbeda dari asumsi | Margin, komisi, cashback salah hitung | Tahap 0 langkah 3 wajib sebelum Tahap 1 |
| Jalur cek status tanpa sengaja memanggil `pay-pasca` | Tagihan terbayar dua kali | 7.6: `pay-pasca` hanya punya satu pemanggil; kriteria penerimaan khusus |
| `status-pasca` beruntun < 1 menit untuk `ref_id` yang sama | Race condition/duplikasi yang tidak ditanggung Digiflazz | Pagar §5e yang sudah berjalan untuk prabayar (7.17) |
| Jawaban "Data belum ada" dianggap Gagal | Saldo dilepas padahal tagihan terbayar — Digides menanggung tagihan | 7.6: tidak pernah melepas otomatis, ditangani manual |
| Harga saat bayar > saat cek tagihan (tanpa `max_price`) | Transaksi rugi | 7.7: terlihat, tercatat, komisi & cashback ikut dibatasi |
| Kategori bertabrakan nama | Tagihan muncul di grid token, markup salah | 7.9: pemisahan per jenis di skema |
| Aturan komisi/cashback GLOBAL ikut ke tagihan | Pengeluaran tak terduga | Dibatasi margin; admin diberi tahu sebelum rilis (7.8) |
| Salah bayar tagihan orang lain | Uang pelanggan hilang, tidak bisa dibatalkan | Nama pelanggan paling menonjol di layar rincian (7.13) |
| Cek tagihan dipakai berlebihan | rc 86, akun Digiflazz dibatasi | 7.15 |
| Pending lama (tagihan sering diproses lebih lambat dari pulsa) | Mitra melihat "masih diproses" | Sama dengan prabayar hari ini; teks layar hasil menyebut tagihan bisa butuh beberapa menit |
| Tengah malam: cek tagihan 23.55, bayar 00.02 | Ditolak Digiflazz | 7.4: `expires_at` tidak pernah melewati akhir tanggal |

---

## 13. Pertanyaan untuk pemilik produk

1. **Isi Gelombang 1** — tampilkan keempat brand yang ada (PLN Pascabayar,
   internet, Telkomsel Omni, PDAM), atau sembunyikan dulu PDAM yang hanya
   melayani Aetra dan Batam?
2. **Minta Digiflazz membuka produk lain?** BPJS Kesehatan yang paling sering
   dibayar di loket desa tidak ada di akun ini. Perlu saya buatkan draf
   permintaannya?
3. **Nomor uji** — bisa kirim satu ID pelanggan PLN pascabayar yang nyata
   (boleh milik Anda sendiri) untuk memastikan arti `price` dan
   `selling_price`? Cek tagihan tidak menarik uang.
4. **Biaya layanan** — mulai dari Rp0 (keuntungan hanya komisi Digiflazz,
   Rp550–2.440 per transaksi) selama masa uji, atau langsung ditambah?
5. **Masa berlaku 30 menit** — terlalu pendek untuk kebiasaan loket di desa?
6. **Aturan komisi dan cashback GLOBAL** yang sudah aktif — boleh ikut
   berlaku ke tagihan, atau tagihan dikecualikan?
7. **Menu TAGIHAN** — token PLN dipindah ke mana?
