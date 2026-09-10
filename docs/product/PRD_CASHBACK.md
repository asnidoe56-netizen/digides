# PRD Cashback Produk

**Versi 1.0** · 10 September 2026 · **Belum dikerjakan**
Lanjutan dari mesin transaksi yang terkunci (`FLOW_KERJA_DAN_BATASAN_KERJA_TRANSAKSI.md`)
Migrasi berikutnya: **055**

---

## 1. Ringkasan

Mitra membeli produk dengan **harga normal**. Begitu transaksinya berstatus
**SUCCESS**, sejumlah uang langsung masuk kembali ke saldo utamanya sebagai
**cashback**.

Contoh nyata dengan angka produksi hari ini:

| | |
|---|---|
| Telkomsel 5.000, harga modal Digiflazz | Rp5.010 |
| Markup Digides | Rp500 |
| **Yang dibayar mitra** | **Rp5.510** |
| Cashback (misalnya) | Rp200 |
| **Yang benar-benar keluar dari kantong mitra** | **Rp5.310** |
| Sisa untuk Digides | Rp300 |

Harga di layar tetap Rp5.510. Tidak ada harga yang diubah, tidak ada
diskon, tidak ada potongan di depan.

---

## 2. Kenapa cashback, bukan menurunkan harga

Menurunkan harga jadi Rp5.310 akan memberi hasil akhir yang sama persis
untuk mitra. Tapi keduanya bukan hal yang sama:

**Menurunkan harga mengubah mesin harga.** `markup_rules`,
`catalog.service.ts`, dan `transactions.selling_price` semuanya ikut
bergerak. Setiap perubahan di sana menyentuh jalur yang memegang uang
nyata dan sudah terbukti berjalan.

**Cashback tidak menyentuh mesin harga sama sekali.** Ia terjadi
*sesudah* transaksi selesai, di jalur terpisah, dan kalau ia gagal
transaksinya tetap sah.

Dan secara perilaku keduanya berbeda: harga yang turun hanya membuat
Digides terlihat murah sekali, lalu terlupakan. Cashback yang masuk ke
saldo **terasa** — mitra melihat saldonya bertambah setelah berjualan,
dan uang itu tetap berada di dalam Digides untuk dibelanjakan lagi.

---

## 3. Ruang lingkup MVP

### Masuk MVP

- Aturan cashback dengan cakupan **GLOBAL / KATEGORI / BRAND / PRODUK**,
  persis bentuk `markup_rules` yang sudah ada
- Tipe **NOMINAL** (Rp200) dan **PERSENTASE** (dari margin Digides, §6.3)
- Pembatas: minimal transaksi, maksimal cashback, masa berlaku
  (`effective_from` / `effective_until`)
- Cashback masuk **langsung ke saldo utama** begitu transaksi SUCCESS
- Baris **CASHBACK** hijau di Histori
- **Lencana cashback di katalog** — sebelum membeli, bukan sesudah (§6.5)
- Menu **Cashback** di Super Admin: buat, ubah, nonaktifkan aturan
- Laporan: total cashback yang sudah dibayarkan, per periode

### Sengaja di luar MVP

- Cashback bertingkat berdasarkan volume ("beli 10 dapat lebih besar")
- Cashback tertahan (holding period) — cashback MVP selalu langsung
- Cashback untuk barang dagangan warung (Digides Toko) — itu margin
  warung sendiri, bukan margin Digides (lihat PRD Kasir Pintar §6.6)
- Kupon/kode promo
- Cashback yang bisa ditarik terpisah dari saldo

---

## 4. Perubahan skema

| Migrasi | Isi | Catatan |
|---|---|---|
| `055_cashback` | Tabel `cashback_rules`, tabel `cashback_ledger`, tipe ledger `CASHBACK` | Tidak satu pun kolom yang ada diubah |

### `cashback_rules`

Meniru bentuk `markup_rules` (migrasi 005) supaya admin yang sudah
memahami Markup langsung memahami ini juga:

```
id, scope_type (GLOBAL|CATEGORY|BRAND|PRODUCT),
category_id, brand_id, product_id,
cashback_type (NOMINAL|PERCENTAGE), cashback_value numeric(14,4),
min_transaction, max_cashback,
priority smallint, effective_from, effective_until, is_active,
created_at, updated_at
```

### `cashback_ledger`

```
id, transaction_id uuid NOT NULL UNIQUE REFERENCES transactions(id),
beneficiary_user_id, wallet_id, cashback_rule_id,
amount numeric(18,0) NOT NULL CHECK (amount > 0),
created_at
```

**`transaction_id` UNIQUE adalah jaminan utamanya**, bukan pemeriksaan di
kode. Satu transaksi hanya bisa menghasilkan satu cashback, selamanya —
dan itu dijamin basis data, bukan disiplin pemrogram. Alasannya sama
dengan `store_settlements.idempotency_key`: percobaan ulang yang terjadi
karena timeout tidak boleh membayar dua kali.

Tabelnya **append-only** dengan trigger `forbid_mutation()`, seperti
`wallet_ledger` dan kelima tabel keuangan lainnya.

### Tipe ledger baru

```sql
ALTER TABLE wallet_ledger DROP CONSTRAINT wallet_ledger_type_check;
ALTER TABLE wallet_ledger ADD CONSTRAINT wallet_ledger_type_check
  CHECK (type IN (..., 'CASHBACK'));
```

Gerakan satu baris yang sama sudah dilakukan tiga kali (migrasi 022, 048,
050).

---

## 5. Alur

```
Mitra beli pulsa Rp5.510
   │
   ▼
RESERVE Rp5.510  ──►  kirim ke Digiflazz  ──►  jawaban Sukses
   │
   ▼
applyDigiflazzResult → captureTransaction → status SUCCESS
   │  (DEBIT Rp5.510 — TIDAK BERUBAH SAMA SEKALI)
   │
   ├──►  awardCommissionForTransaction()   ← sudah ada sekarang
   │
   └──►  awardCashbackForTransaction()     ← BARU, di sebelahnya
             │
             ├── cari aturan cashback yang cocok
             ├── hitung, batasi dengan sisa margin (§6.2)
             ├── tulis cashback_ledger (UNIQUE transaction_id)
             └── postLedgerEntry CASHBACK → saldo utama bertambah
```

Titik sambungnya **satu baris** di `transaction.service.ts`, tepat di
sebelah pemanggilan komisi yang sudah ada:

```ts
if (finalTransaction.status === "SUCCESS") {
  await awardCommissionForTransaction(...).catch(log);
  await awardCashbackForTransaction(...).catch(log);   // baru
}
```

Ditangkap, bukan dilempar — dengan alasan yang persis sama dengan komisi:
**cashback yang gagal tidak boleh membatalkan pembelian yang sudah
selesai.** Pulsanya sudah sampai ke pelanggan; menggagalkan transaksinya
karena cashback bermasalah akan menciptakan kerugian dari sebuah hadiah.

---

## 6. Keputusan desain

### 6.1 Dokumen terkunci tidak perlu diamandemen

Ini diperiksa lebih dulu, sebelum apa pun dirancang.

`FLOW_KERJA_DAN_BATASAN_KERJA_TRANSAKSI.md` §5 aturan 4 menyatakan
`applyDigiflazzResult` adalah satu-satunya titik yang boleh memanggil
`captureTransaction`/`releaseTransaction`. **Cashback tidak menyentuh
keduanya.** Ia berjalan sesudah keduanya selesai, di luar
`withTransaction()` yang menahan saldo, persis seperti
`awardCommissionForTransaction` yang sudah berjalan di produksi sejak
lama.

Tidak ada state machine baru, tidak ada jalur kedua ke Digiflazz, tidak
ada `ref_id` baru, tidak ada perubahan RESERVE/DEBIT/RELEASE.

**Kesimpulan: cashback muat di dalam arsitektur yang ada, bukan melawan
sisinya.** Kalau suatu rancangan cashback nanti menuntut menyentuh
`captureTransaction`, rancangan itu yang salah — bukan dokumennya.

### 6.2 Cashback dan komisi minum dari gelas yang sama

**Ini keputusan paling penting di dokumen ini, dan yang paling mahal
kalau terlewat.**

Margin Digides pada satu transaksi adalah `selling_price − base_price`.
Angka produksi hari ini untuk Telkomsel 5.000:

| | |
|---|---|
| Margin Digides | Rp500 |
| Komisi ke upline tier MITRA | Rp300 |
| **Sisa** | **Rp200** |

Kalau cashback dipasang Rp300 tanpa memperhitungkan komisi, Digides
**rugi Rp100 setiap transaksi** — dan ruginya tidak terlihat di mana pun
sampai ada yang menjumlahkan sebulan kemudian.

`awardCommissionForTransaction` sudah menjaga dirinya sendiri
(`amount = Math.min(amount, actualProfit)`), tetapi ia tidak tahu apa-apa
tentang cashback, dan sebaliknya.

**Aturannya:**

```
sisaMargin = (selling_price − base_price) − komisi yang sudah diberikan
cashback   = min(cashback terhitung, max_cashback, sisaMargin)
```

Cashback dihitung **setelah** komisi, dan hanya boleh mengambil dari
sisanya. Urutan ini disengaja: komisi adalah janji kepada upline yang
sudah berjalan lebih dulu dan tidak boleh dikurangi oleh fitur baru.

Kalau sisanya nol, cashback tidak dibayar dan **tidak ada baris yang
ditulis** — bukan baris Rp0 yang membingungkan.

**Panel admin harus menampilkan peringatan ini saat aturan dibuat**, bukan
menunggu bulan depan: kalau seorang admin mengetik cashback yang lebih
besar dari margin dikurangi komisi terbesar yang mungkin, layarnya harus
mengatakan berapa yang akan benar-benar terbayar.

### 6.3 Persentase dihitung dari margin, bukan dari harga jual

Cashback 10% dari harga jual Rp5.510 adalah Rp551 — lebih besar dari
seluruh margin Rp500. Setiap transaksi akan rugi.

Cashback 10% dari margin Rp500 adalah Rp50. Aman menurut definisinya
sendiri, apa pun harga produknya.

Ini keputusan yang sama yang sudah diambil mesin komisi ("PERCENTAGE:
bagian dari keuntungan platform pada transaksi INI, tidak pernah bagian
dari selling_price pembeli"), dan konsistensinya penting: dua fitur yang
menghitung persen dari dasar yang berbeda akan tertukar oleh siapa pun
yang mengatur keduanya.

### 6.4 Cashback masuk langsung, tanpa masa tahan

Komisi punya `holding_period_days` karena ia hadiah untuk **mengajak
orang** — dan orang yang diajak bisa saja membatalkan, menipu, atau
menghilang. Masa tahan adalah jeda untuk melihat.

Cashback adalah hadiah untuk **transaksi yang sudah berhasil**. Tidak ada
yang perlu ditunggu: produknya sudah terkirim, uangnya sudah berpindah,
dan Digiflazz sudah menjawab Sukses.

Menahan cashback juga akan menghapus alasan ia dibuat. Yang membuat
cashback terasa adalah saldo yang bertambah **saat itu juga**, di layar
yang sama tempat mitra baru saja menekan tombol beli.

### 6.5 Cashback harus terlihat SEBELUM membeli

Cashback yang hanya muncul setelah transaksi selesai adalah kejutan yang
menyenangkan sekali, lalu tidak mengubah apa-apa. Yang membuatnya bekerja
sebagai alat dagang adalah mitra **memilih** produk itu karena ada
cashbacknya.

Jadi lencana `Cashback Rp200` tampil di:
- kartu produk di katalog (sebelum dipilih)
- layar konfirmasi pembelian (sebelum PIN dimasukkan)
- layar hasil (`Anda dapat cashback Rp200`)
- baris hijau di Histori

**Yang tidak boleh:** mengubah angka harga yang ditampilkan. Harga tetap
Rp5.510, lencananya di sebelahnya. Harga coret akan membuat orang
mengira ia membayar Rp5.310 di muka, lalu bingung ketika saldonya
berkurang Rp5.510.

### 6.6 Kalau transaksi sukses lalu dikembalikan

`REFUND` ada di tipe ledger dan bisa dilakukan admin atas transaksi yang
sudah SUCCESS.

Kalau itu terjadi, mitra memegang cashback untuk pembelian yang uangnya
sudah dikembalikan penuh — untung bersih dari transaksi yang batal.

**Keputusan MVP: cashback TIDAK ditarik kembali otomatis**, tapi panel
refund **wajib menampilkan peringatan** bahwa transaksi ini punya
cashback Rp… yang tidak ikut tertarik, supaya admin memutuskan sadar —
bukan menemukan belakangan.

Alasan tidak dibuat otomatis: penarikan otomatis bisa membuat saldo mitra
minus kalau uangnya sudah dibelanjakan, dan saldo minus adalah keadaan
yang seluruh sistem ini dirancang untuk tidak pernah punya. Menariknya
dengan benar butuh perancangan tersendiri.

### 6.7 SKU cadangan mengubah margin, dan cashback harus ikut sadar

Mekanisme SKU cadangan otomatis (dokumen terkunci §5a) bisa menyelesaikan
pembelian dengan produk **lain** yang lebih mahal, sementara
`selling_price` tetap beku di harga awal. Marginnya jadi menipis, kadang
nol.

Karena §6.2 menghitung dari `selling_price − base_price` dan `base_price`
selalu mencerminkan SKU yang benar-benar memenuhi pembelian, ini sudah
tertangani dengan sendirinya: pada transaksi yang marginnya habis karena
SKU cadangan, cashbacknya otomatis mengecil atau nol.

**Yang harus diputuskan sadar:** mitra sudah melihat lencana `Cashback
Rp200` sebelum membeli, lalu menerima Rp50 karena SKU cadangan. Untuk MVP
ini diterima apa adanya dan **layar hasil menampilkan jumlah yang benar-
benar diterima**, bukan yang dijanjikan lencana. Janji yang lebih kuat
("selalu dapat Rp200 apa pun yang terjadi") berarti Digides menanggung
selisihnya, dan itu keputusan bisnis tersendiri.

---

## 7. Sentuhan pada kode yang sudah jalan

| Bagian | Perubahan | Risiko |
|---|---|---|
| Mesin transaksi, RESERVE/DEBIT/RELEASE | **Tidak disentuh sama sekali** | Nol |
| `applyDigiflazzResult`, state machine | **Tidak disentuh sama sekali** | Nol |
| Mesin harga (`markup_rules`, katalog) | **Tidak disentuh sama sekali** | Nol |
| Mesin komisi | **Tidak diubah**, hanya dibaca hasilnya (§6.2) | Rendah |
| `transaction.service.ts` | **+1 baris** di blok SUCCESS yang sudah ada | Rendah |
| `wallet_ledger` | +1 nilai pada CHECK | Rendah |

---

## 8. Kriteria penerimaan

- Membeli produk bercashback: saldo berkurang **penuh** sesuai harga,
  lalu bertambah sejumlah cashback — dua baris terpisah di Histori.
- `transactions.selling_price` sama persis dengan sebelum cashback ada.
- Satu transaksi tidak pernah menghasilkan dua baris cashback, **bahkan
  bila fungsinya dipanggil dua kali**.
- Cashback + komisi pada satu transaksi tidak pernah melebihi
  `selling_price − base_price`.
- Aturan yang kedaluwarsa (`effective_until` lewat) tidak membayar apa pun.
- Transaksi **gagal** tidak menghasilkan cashback.
- Cashback yang gagal ditulis **tidak** menggagalkan pembelian.
- Aturan PRODUK mengalahkan BRAND, BRAND mengalahkan KATEGORI, KATEGORI
  mengalahkan GLOBAL.
- Lencana cashback di katalog cocok dengan yang benar-benar diterima,
  kecuali pada transaksi yang diselamatkan SKU cadangan (§6.7).

---

## 9. Urutan pengerjaan

**Tahap 1 — Mesin.**
Migrasi 055; `cashback.service.ts` dengan `awardCashbackForTransaction`;
satu baris sambungan di `transaction.service.ts`.
*Selesai bila*: pembelian uji menghasilkan tepat satu baris CASHBACK,
saldo bertambah, dan memanggil fungsinya dua kali tidak membayar dua kali.

**Tahap 2 — Panel Super Admin.**
Menu Cashback: daftar aturan, buat/ubah/nonaktifkan, dengan peringatan
margin §6.2 yang hidup saat mengetik.
*Selesai bila*: admin bisa memasang cashback Rp200 pada satu produk dan
melihat peringatan ketika angkanya melebihi sisa margin.

**Tahap 3 — Terlihat oleh mitra.**
Lencana di katalog dan layar konfirmasi (web & Flutter), baris hijau di
Histori, jumlah diterima di layar hasil.
*Selesai bila*: mitra bisa melihat cashback sebelum membeli, dan
mencocokkannya dengan yang masuk sesudahnya.

**Tahap 4 — Laporan.**
Total cashback terbayar per periode di Laporan Super Admin, dan
pengaruhnya pada Keuntungan.
*Selesai bila*: Super Admin bisa menjawab "cashback bulan ini memakan
berapa dari keuntungan?"

---

## 10. Risiko

| Risiko | Dampak | Penanganan |
|---|---|---|
| Cashback + komisi melebihi margin | **Rugi diam-diam setiap transaksi**, tidak terlihat sampai dijumlahkan sebulan | §6.2: dibatasi sisa margin, plus peringatan hidup di panel admin |
| Persentase dihitung dari harga jual | Rugi pada setiap produk bermargin tipis | §6.3: persentase selalu dari margin |
| Cashback dibayar dua kali karena percobaan ulang | Uang keluar dua kali | `transaction_id UNIQUE` di basis data, bukan pemeriksaan di kode |
| Cashback menggagalkan pembelian yang sudah sukses | Kerugian yang lahir dari hadiah | `.catch()` seperti komisi — cashback gagal dicatat, penjualan tetap sah |
| Transaksi sukses lalu di-refund | Mitra untung dari transaksi batal | §6.6: peringatan di panel refund; penarikan otomatis sengaja ditunda |
| Lencana menjanjikan lebih dari yang diterima (SKU cadangan) | Mitra merasa dibohongi | §6.7: layar hasil menampilkan jumlah sebenarnya |
| Fitur ini menunda uji coba 1 bulan | **Yang paling mahal** — model bisnisnya belum tervalidasi | Lihat §11 |

---

## 11. Catatan penutup — apakah ini dikerjakan sekarang?

Rancangan ini muat rapi di arsitektur yang ada dan tidak menyentuh apa
pun yang terkunci. Secara teknis ia siap dikerjakan.

Tapi Digides sedang memasuki **uji coba satu bulan** dengan warung
sungguhan, dan pertanyaan yang belum terjawab bukan "apakah cashback bisa
dibangun", melainkan **apakah mitra mau memakai Digides setiap hari**.
Cashback adalah alat untuk mendorong pemakaian yang sudah ada, bukan
untuk menciptakannya.

Ada juga satu hal yang hanya bisa dijawab oleh uji coba itu: **berapa
margin yang sebenarnya boleh diberikan.** Angka hari ini menunjukkan
margin Rp500 dengan komisi Rp300 — ruang untuk cashback hanya Rp200 pada
tier MITRA. Apakah Rp200 cukup terasa untuk mengubah perilaku mitra
adalah pertanyaan yang jawabannya ada di warung, bukan di dokumen ini.

**Saran: rancangan ini disimpan siap, dikerjakan setelah uji coba
memberi dua angka** — berapa transaksi per mitra per hari, dan berapa
margin rata-rata yang benar-benar tersisa setelah komisi.

Kalau uji coba justru menunjukkan mitra kurang bersemangat bertransaksi,
cashback naik prioritas — dan pada saat itu ia bisa langsung dikerjakan
karena rancangannya sudah ada.
