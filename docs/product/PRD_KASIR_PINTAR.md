# PRD Kasir Pintar — Digides Toko

> **Versi 2.0 · 9 September 2026 · Usulan, belum dikerjakan**
> Menggantikan v1.0. Kelanjutan dari `PRD_DIGIDES_TOKO.md` (v2.8, Tahap 1–4 selesai & live).
> Dokumen ini hanya membahas **kasir untuk barang dagangan warung sendiri**. Entitas toko, dompet toko, mesin pembayaran, dan struk sudah ada dan tidak diubah.

Membuat kasir warung secepat kasir minimarket — **pindai barang, masuk keranjang, selesai** — dan membuat warung akhirnya bisa tahu **untungnya**, bukan cuma omzetnya.

---

## 0. Ringkasan

Kasir Digides Toko hari ini sudah berfungsi, tapi bekerja dengan cara **mengetik**: kasir mengetik sebagian nama produk, hasilnya tersaring, lalu ditekan. Untuk warung dengan 10 produk itu cukup. Untuk warung dengan 150 SKU rokok dan minuman, itu titik lambat yang membuat kasir kalah cepat dibanding mencatat di buku.

Empat hal yang diusulkan:

1. **Barcode pada produk** — dipindai saat menambah produk, dipindai lagi saat menjual.
2. **Kategori produk** (Rokok, Minuman, dan seterusnya) — menyaring cepat di kasir, dan menjawab "rokok laku berapa bulan ini".
3. **Kasir mode pindai** — kamera menyala, pindai, langsung masuk keranjang.
4. **Modal & margin toko** — harga beli disimpan di samping harga jual, sehingga warung bisa menghitung untungnya.

**Yang sengaja tidak diusulkan**, dan alasannya ditulis di §3.1: mencatat produk Digides (pulsa, token) sebagai dagangan toko. Juga di luar cakupan: timbangan, diskon, promo, printer termal, dan multi-kasir.

---

## 1. Masalah yang diselesaikan

### 1.1 Mengetik itu lambat, dan barcode menghapusnya

Sebuah warung menjual *Djarum Super 12*, *Djarum Super 16*, *Djarum Black*, *Djarum Coklat*. Mengetik "djarum" memunculkan empat baris yang harus dibaca dan dibedakan — di layar HP, sambil pembeli menunggu, sering dalam cahaya redup. Barcode menghapus seluruh langkah itu: satu pindaian menunjuk **tepat satu** produk, tanpa ambiguitas dan tanpa membaca.

### 1.2 Tapi separuh dagangan warung tidak berbarcode

Gorengan, es batu, kopi seduh, minyak curah — tidak ada barcode-nya, dan jumlahnya tidak sedikit. Untuk itu kasir butuh jalan pintas visual, bukan pencarian teks. Itulah gunanya kategori.

Keduanya perlu ada. Kasir yang hanya bisa memindai akan gagal di gorengan; kasir yang hanya bisa mencari teks akan lambat di rokok.

### 1.3 Warung tidak tahu untungnya

Hari ini `store_products` hanya menyimpan **harga jual**. Tidak ada modal di mana pun — tidak di produk, tidak di baris pesanan. Akibatnya Riwayat Toko hanya bisa menjawab *"berapa jualan hari ini"*, tidak pernah *"berapa untung hari ini"* — padahal itu pertanyaan yang sebenarnya ditanyakan pemilik warung tiap tutup toko.

---

## 2. Fondasi yang sudah ada

Sengaja diinventarisasi supaya tidak ada yang dibangun ulang.

| Kebutuhan | Sudah tersedia sebagai | Status |
|---|---|---|
| Pemindai kamera di aplikasi mitra | `QrScanScreen` (`mobile_scanner`), dipakai untuk nomor meter PLN dan QR pembayaran toko. Dibuat **tanpa batasan format**, jadi ia sudah membaca EAN-13/UPC barang kemasan hari ini. | SUDAH ADA |
| Produk toko + stok + aktif/nonaktif | `store_products` + `store_inventory_events` | SUDAH ADA |
| Keranjang, total, QR bayar, struk | `store_orders`, `store_payment_requests`, `struk_pdf.dart` | SUDAH ADA |
| Pola "harga dibekukan saat transaksi" | `store_order_items.unit_price` sudah disalin saat checkout; `transactions.base_price` sudah membekukan modal Digiflazz. Polanya terbukti, tinggal ditiru untuk modal. | SUDAH ADA |
| Kolom barcode pada produk | Belum ada. | BARU |
| Kategori produk | Belum ada. | BARU |
| Kasir mode pindai | Belum ada — kasir sekarang hanya cari-ketik. | BARU |
| Modal & margin produk toko | Belum ada. | BARU |

**Konsekuensi penting**: karena pemindainya sudah ada dan sudah terbukti di produksi, bagian tersulit fitur ini — izin kamera, siklus hidup controller, penanganan frame ganda — **sudah selesai dan sudah teruji**. Tidak perlu paket baru. Yang tersisa sebagian besar adalah data dan layar.

---

## 3. Ruang lingkup

### Masuk MVP

- Kolom `barcode` pada produk toko, diisi manual **atau** dengan memindai
- Pindai saat menambah produk: kamera → barcode terisi → tinggal isi nama, harga, stok
- Kategori dari daftar baku: Rokok, Minuman, Makanan Ringan, Sembako, Rumah Tangga, Lainnya
- Kasir: tombol pindai, barang langsung masuk keranjang, kamera tetap menyala
- Kasir: baris tab kategori untuk barang tanpa barcode
- Barcode tidak dikenal → tawarkan "Tambah produk baru" dengan barcode sudah terisi
- **Modal (harga beli)** pada produk, opsional, dengan margin tampil hidup
- **Pembantu margin**: isi persen, harga jual terhitung sendiri dan dibulatkan
- Laporan **penjualan dan untung** per kategori di Riwayat Toko

### Sengaja di luar MVP

- **Mencatat produk Digides (pulsa, token, e-money) sebagai dagangan toko** — lihat §3.1
- Timbangan / barang per kilogram (beras, gula curah) — butuh harga-per-satuan dan input berat, masalah yang berbeda
- Rata-rata modal bergerak / FIFO — modal dicatat per produk, bukan per batch pembelian
- Printer termal Bluetooth — struk sudah bisa dibagikan dan dicetak lewat PDF
- Diskon, promo, harga grosir, harga member
- Multi-kasir / akun karyawan
- Piutang & data pelanggan
- Katalog barcode bersama antar-toko (§6.3)
- Pemindai di web (§6.4)

### 3.1 Kenapa produk Digides tidak ikut dicatat di toko

Ide yang sempat dibahas: ketika mitra menjual pulsa dari saldo utamanya, penjualan itu ikut tercatat sebagai penjualan tokonya, lengkap dengan untungnya.

Idenya masuk akal — bagi warung, pulsa memang dagangan, sering justru yang paling laku. **Tetapi diputuskan tidak dibangun sekarang, atas pertimbangan keamanan**, dan alasannya kuat:

- Ia menyambungkan dua domain yang selama ini sengaja dipisah: mesin transaksi PPOB (terkunci, memegang uang nyata, sudah terbukti di produksi) dengan pembukuan toko. Setiap sambungan baru ke domain terkunci adalah risiko yang harus dibayar dengan verifikasi ulang.
- Ia menuntut sistem menebak niat: tidak semua pembelian PPOB adalah penjualan ulang. Mitra juga membeli untuk dirinya sendiri — termasuk saat mengubah saldo tokonya jadi DANA lewat alur yang baru saja dibangun. Salah menebak berarti **untung palsu** di laporan, dan laporan yang salah lebih buruk daripada tidak ada laporan.
- Ia menyeret pertanyaan lanjutan yang belum ada jawabannya: penjualan tunai, piutang, metode pembayaran — semuanya mengubah Digides Toko dari fitur pembayaran menjadi produk pembukuan penuh.

**Keputusan: kasir ini hanya mengurus barang dagangan fisik warung sendiri.** Penjualan PPOB tetap berada di Histori seperti sekarang. Kalau nanti pilot menunjukkan warung memang membutuhkannya, itu dibahas sebagai keputusan tersendiri dengan bobotnya sendiri.

---

## 4. Perubahan skema

Melanjutkan penomoran migrasi yang ada (terakhir `050_store_settlement.sql`).

| Migrasi | Isi | Catatan penting |
|---|---|---|
| `051_store_product_barcode` | Tambah `store_products.barcode text`, indeks unik parsial per toko | Unik pada `(store_id, barcode)`, **bukan** global — §6.1. Nullable, karena mayoritas barang warung tidak punya barcode. |
| `052_store_product_category` | Tabel `store_product_categories` (daftar baku), kolom `store_products.category_id` | Daftar baku dipakai bersama semua toko supaya laporan lintas-warung mungkin — §6.2. Nullable, produk lama tetap valid tanpa migrasi data. Namanya diberi awalan `store_` karena tabel `categories` (migrasi 004) sudah dipakai katalog PPOB — dua nama yang mirip di domain berbeda adalah kekeliruan yang menunggu terjadi. |
| `053_store_product_cost` | Tambah `store_products.cost_price` dan `store_order_items.unit_cost` | Keduanya nullable. `unit_cost` **disalin saat checkout**, sama seperti `unit_price` sudah disalin — §6.5. Margin tidak pernah disimpan, selalu dihitung. |

Ketiganya **hanya menambah kolom nullable**, tidak mengubah satu pun kolom yang ada, sehingga tidak menyentuh mesin pembayaran maupun ledger sama sekali.

---

## 5. Alur kasir yang baru

```
Kasir buka layar Kasir
   │
   ├── Mode Pindai (baru) ──► arahkan kamera ke barcode
   │        │
   │        ├── barcode dikenal → masuk keranjang, jumlah +1, kamera tetap menyala
   │        └── barcode asing   → "Tambah produk baru?" (barcode sudah terisi)
   │
   ├── Tab Kategori (baru) ─► Rokok / Minuman / … → tekan produk
   │
   └── Cari nama (sudah ada) ─► ketik → tekan produk
   │
   ▼
Keranjang & total → Buat QR → pembeli bayar → struk   (tidak berubah)
```

**Tiga keputusan perilaku yang menentukan rasanya:**

1. **Kamera tidak menutup setelah satu pindaian.** Kasir memindai 5 barang berturut-turut tanpa membuka-tutup layar. Ini perbedaan terbesar antara terasa "seperti minimarket" dan terasa seperti aplikasi.
2. **Memindai barang yang sama dua kali menambah jumlah**, bukan membuat baris kedua. Dua bungkus rokok yang sama adalah satu baris "×2".
3. **Umpan balik tiap pindaian**: getar pendek + nama produk muncul sekejap. Di warung yang berisik, kasir tidak boleh perlu melihat layar untuk tahu pindaiannya berhasil.

Stok **tidak** berkurang saat memindai — pengurangan tetap terjadi saat pembayaran dikonfirmasi, persis aturan yang sudah berlaku (PRD Toko §5 langkah 6). Memindai hanya menyusun keranjang.

---

## 6. Keputusan desain

Bagian ini yang paling penting. Salah memilih di sini akan mahal untuk diperbaiki setelah ada data nyata.

### 6.1 Barcode unik per toko, bukan global

Dua warung berbeda sama-sama menjual Djarum Super, dan bungkusnya membawa EAN-13 yang **sama persis**. Kalau barcode dibuat unik secara global, warung kedua yang memindai produk itu akan ditolak sistem dengan alasan yang tidak masuk akal baginya.

**Ini bukan pilihan, ini keharusan: `UNIQUE (store_id, barcode)`.** Setiap toko punya ruang barcode-nya sendiri.

### 6.2 Kategori: daftar baku bersama, bukan teks bebas

| Pilihan | Untung | Rugi |
|---|---|---|
| Teks bebas per toko | Warung menulis apa pun sesuai kebiasaannya | Laporan lintas-warung mustahil — "Rokok", "rokok", "ROKOK" jadi tiga kategori berbeda |
| **Daftar baku bersama** | Laporan lintas-warung mungkin; menekan lebih cepat daripada mengetik | Warung belum bisa membuat kategori sendiri di MVP |

**Rekomendasi: daftar baku.** Enam kategori menutup hampir seluruh isi warung. Menambah kategori kustom nanti mudah; membersihkan teks bebas yang telanjur kotor hampir mustahil.

### 6.3 Katalog barcode bersama antar-toko — ditunda

Idenya menggoda: begitu satu warung memberi nama pada barcode Djarum Super, warung berikutnya yang memindainya cukup menerima nama itu. Makin bernilai seiring bertambahnya toko.

Tapi ia membawa pertanyaan yang belum ada jawabannya: siapa yang memiliki data itu, apa yang terjadi kalau warung pertama salah menamai, bagaimana kalau dua warung tidak sepakat, dan apakah nama produk satu warung boleh terlihat oleh warung lain.

**Rekomendasi: tunda.** Simpan barcode per toko dulu. Kalau nanti banyak barcode yang sama muncul di banyak toko, data itu sendiri yang akan memberi tahu apakah katalog bersama layak dibangun.

### 6.4 Ini fitur yang Flutter lebih dulu — dan itu melanggar kebiasaan proyek

Aturan proyek selama ini: **web adalah sumber kebenaran**, Flutter menyusul. Untuk fitur ini aturan itu tidak pas, dan alasannya jujur: kasir warung dipakai **di HP**, sambil berdiri, satu tangan memegang barang — dan pemindai kameranya **hanya ada di Flutter**.

**Rekomendasi**: backend dan skema tetap dikerjakan lebih dulu di `digides` (tetap sumber kebenaran untuk data dan API), tapi **layar mode pindai dibuat di Flutter lebih dulu**, dan web mendapat versi tanpa kamera (input barcode manual + tab kategori). Penyimpangan yang disengaja dan dicatat, bukan kelalaian.

### 6.5 Modal disalin saat checkout, bukan dibaca dari produk

Ini keputusan yang paling mudah salah, dan akibatnya baru terasa berbulan-bulan kemudian.

Harga modal berubah: rokok naik harga, warung memperbarui modalnya dari Rp18.000 jadi Rp19.500. Kalau laporan untung membaca **modal produk saat ini**, maka untung bulan lalu ikut berubah setiap kali modal diperbarui — laporan yang dicetak kemarin tidak akan sama isinya hari ini. Itu bukan laporan, itu tebakan yang bergerak.

**Keputusan: salin `unit_cost` ke `store_order_items` saat pesanan dibuat**, persis seperti `unit_price` dan `product_name` yang sudah disalin di sana hari ini. Untung sebuah pesanan dihitung dari angka yang berlaku **saat transaksi itu terjadi**, dan tidak pernah berubah lagi setelahnya.

**Margin tidak pernah disimpan.** Ia selalu `harga jual − modal`. Menyimpan keduanya mengundang keduanya berbeda.

### 6.6 Margin toko bukan markup Digides — dan namanya tidak boleh sama

Ini pembedaan yang paling mudah dirusak oleh orang berikutnya yang menyentuh kode ini, jadi ditulis eksplisit.

| | **Markup Digides** | **Margin toko** |
|---|---|---|
| Siapa yang mengatur | Super Admin, lewat menu Markup | Pemilik warung, di produknya sendiri |
| Apa yang ditentukan | Berapa **mitra membayar** ke Digides | Berapa **warung menjual** ke pelanggannya |
| Menyentuh harga transaksi? | Ya — itu memang produknya Digides | **Tidak sama sekali** |
| Dibaca oleh | `markup_rules`, katalog, mesin transaksi | **Hanya laporan untung warung itu sendiri** |

Margin toko adalah **angka pembukuan**, bukan mesin harga. Ia tidak pernah masuk ke `markup_rules`, tidak mengubah `selling_price`, dan tidak menyentuh alur transaksi yang terkunci.

**Batas keras yang harus dijaga**: `transaction.service.ts` dan `catalog.service.ts` tidak boleh membaca kolom margin toko sama sekali.

**Dan namanya tidak boleh sama.** Digides sudah punya "markup"; milik warung selalu disebut **"margin toko"** atau **"harga jual toko"**. Dua hal berbeda dengan nama yang sama adalah undangan bagi orang berikutnya untuk menyambungkannya.

### 6.7 Cara mengisi: modal + harga jual dalam rupiah, persen hanya pembantu

Pemilik warung berpikir dalam rupiah — *"beli 10 ribu, jual 12 ribu"* — bukan dalam persen. Jadi kolom utamanya **Modal** dan **Harga Jual**, dengan margin tampil hidup di bawahnya (`Untung Rp2.000 · 20%`).

Persen tetap berguna sebagai **pembantu, bukan sumber kebenaran**: ada tombol kecil "isi margin %", diketik `20`, harga jual terisi otomatis — lalu bebas ditimpa. Satu detail yang gampang terlewat: hitungan persen menghasilkan angka seperti Rp11.640, sementara harga warung selalu bulat. **Bulatkan ke kelipatan Rp500 ke atas**, dan biarkan tetap bisa diedit.

Modal juga **boleh dikosongkan**. Warung yang tidak mau repot mencatat modal tetap berjualan seperti sekarang; produk tanpa modal hanya tidak ikut dihitung di laporan untung, dan itu dinyatakan apa adanya di layar — bukan ditampilkan sebagai untung Rp0, yang akan menyesatkan.

---

## 7. Sentuhan pada kode yang sudah jalan

| Berkas | Perubahan | Risiko |
|---|---|---|
| `store_products` | +3 kolom nullable (barcode, kategori, modal) | Rendah — tidak ada kolom lama yang berubah |
| `store_order_items` | +1 kolom nullable (`unit_cost`), disalin saat checkout | Rendah — baris lama tetap valid |
| `store-product.service.ts` | Terima `barcode`, `categoryId`, `costPrice` saat buat/ubah | Rendah |
| `POST /api/store-orders` | **Tidak berubah** — kasir tetap mengirim `storeProductId` | Nol |
| Mesin pembayaran, ledger, stok | **Tidak disentuh sama sekali** | Nol |
| Mesin markup & transaksi PPOB | **Tidak disentuh sama sekali** (§6.6) | Nol |
| `QrScanScreen` (Flutter) | Dipakai ulang; +opsi "jangan tutup setelah satu pindaian" | Rendah — tambah parameter, perilaku lama tetap default |

Yang perlu digarisbawahi: **fitur ini tidak menyentuh satu baris pun kode yang memindahkan uang.** Barcode dan kategori hanya mempercepat cara sebuah `storeProductId` sampai ke keranjang; modal dan margin hanya menambah angka yang dicatat di sampingnya.

---

## 8. Kriteria penerimaan

- [ ] Memindai barcode barang yang terdaftar memasukkannya ke keranjang tanpa mengetik apa pun.
- [ ] Memindai barang yang sama dua kali menghasilkan satu baris berjumlah 2, bukan dua baris.
- [ ] Kamera tetap menyala setelah pindaian berhasil; 5 barang bisa dipindai berturut-turut.
- [ ] Memindai barcode yang belum terdaftar menawarkan pembuatan produk baru dengan barcode sudah terisi.
- [ ] Dua toko berbeda bisa mendaftarkan barcode yang sama persis tanpa saling mengganggu.
- [ ] Barang tanpa barcode tetap bisa dijual secepat sekarang, lewat tab kategori atau pencarian nama.
- [ ] Riwayat Toko bisa menjawab "berapa penjualan kategori Rokok bulan ini".
- [ ] Riwayat Toko bisa menjawab "berapa **untung** hari ini", bukan hanya omzetnya.
- [ ] Mengubah modal sebuah produk **tidak mengubah** angka untung pesanan yang sudah lewat.
- [ ] Produk tanpa modal tetap bisa dijual, dan dinyatakan apa adanya di laporan — bukan dihitung untung Rp0.
- [ ] Mengisi margin persen menghasilkan harga jual bulat yang masih bisa diedit.
- [ ] Margin toko tidak muncul di mana pun pada harga yang dibayar mitra ke Digides.

---

## 9. Urutan pengerjaan

**Tahap 1 — Data.**
Migrasi 051, 052 & 053; endpoint produk menerima barcode, kategori, dan modal; kategori baku di-seed; `unit_cost` ikut disalin saat pesanan dibuat.
*Selesai bila*: produk bisa disimpan dengan barcode, kategori, dan modal lewat API; dua toko bisa memakai barcode yang sama; dan mengubah modal produk tidak mengubah untung pesanan yang sudah lewat.

**Tahap 2 — Kelola produk.**
Layar tambah/ubah produk (Flutter & web) menerima barcode, kategori, dan modal, dengan margin tampil hidup dan pembantu persen; di Flutter barcode bisa diisi dengan memindai.
*Selesai bila*: pemilik warung bisa mendaftarkan 10 produk berbarcode beserta modalnya dalam beberapa menit.

**Tahap 3 — Kasir mode pindai (Flutter).**
Kamera menyala terus, pindai → keranjang, getar + nama sekejap, tangani barcode asing.
*Selesai bila*: satu transaksi 5 barang berbarcode selesai di bawah 20 detik.

**Tahap 4 — Tab kategori & laporan untung.**
Baris tab kategori di kasir; rekap penjualan **dan untung** per kategori di Riwayat.
*Selesai bila*: barang tanpa barcode terjual sama cepatnya, dan pemilik warung bisa membaca untungnya hari itu — bukan cuma omzetnya.

---

## 10. Risiko

| Risiko | Dampak | Penanganan |
|---|---|---|
| Barcode dibuat unik global | Warung kedua ditolak saat menjual produk yang sama | Unik per toko sejak migrasi pertama (§6.1) |
| Modal dibaca dari produk, bukan disalin | Untung bulan lalu ikut berubah tiap modal diperbarui — laporan jadi angka yang bergerak | `unit_cost` disalin ke baris pesanan sejak migrasi pertama (§6.5) |
| Margin toko tersambung ke mesin harga Digides | Harga yang dibayar mitra ikut berubah — kerusakan finansial nyata | Batas keras + penamaan berbeda (§6.6), dan kriteria penerimaan yang mengujinya |
| Warung mengisi modal asal-asalan | Laporan untung menyesatkan — lebih buruk daripada tidak ada | Modal opsional; produk tanpa modal dinyatakan apa adanya, bukan untung Rp0 |
| Kamera HP murah lambat / gagal fokus | Kasir kembali mengetik, fitur tak terpakai | Pencarian nama & tab kategori tetap ada berdampingan, bukan diganti |
| Barang tanpa barcode terlupakan dalam desain | Kasir jadi lebih lambat untuk gorengan/es batu — barang yang justru paling sering | Tab kategori masuk MVP, bukan fase berikutnya |
| Fitur ini menunda uji coba warung nyata | **Yang paling mahal** — model bisnisnya belum tervalidasi | Lihat §11 |

---

## 11. Catatan penutup — apakah ini yang harus dikerjakan sekarang?

PRD Toko §10 meminta uji coba ke 5–10 warung nyata sebelum menambah fitur, dan hari ini uji itu belum berjalan.

Ada satu hal yang perlu dilihat jernih sebelum memutuskan. Kasir Digides Toko saat ini **hanya bisa menyelesaikan penjualan yang dibayar dengan saldo Digides.** Kecepatan memindai baru terasa gunanya kalau transaksinya bisa diselesaikan — dan pada tahap pilot, sebagian besar pembeli di warung belum tentu punya saldo Digides.

Artinya kecepatan kasir mungkin **bukan hambatan pertama** warung. Hambatan pertamanya bisa jadi justru: berapa banyak pelanggan yang benar-benar bisa membayar dengan saldo Digides. Itu pertanyaan pilot, bukan pertanyaan fitur.

**Rekomendasi jujur: jalankan pilot dulu dengan kasir yang ada.** Dokumen ini sudah siap dikerjakan kapan pun dan urutannya sudah jelas — tapi keluhan nyata dari warung akan memberi tahu jauh lebih akurat apakah barcode benar-benar yang mereka butuhkan lebih dulu, atau ada hal lain yang belum terpikirkan di sini.
