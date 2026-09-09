# PRD Kasir Pintar — Digides Toko

> **Versi 1.0 · 9 September 2026 · Usulan, belum dikerjakan**
> Kelanjutan dari `PRD_DIGIDES_TOKO.md` (v2.8, Tahap 1–4 selesai & live). Dokumen ini hanya membahas **kasirnya**; entitas toko, dompet toko, mesin pembayaran, dan struk sudah ada dan tidak diubah.

Membuat kasir warung secepat kasir minimarket: **pindai barang, masuk keranjang, selesai** — tanpa mengetik nama produk satu per satu.

---

## 0. Ringkasan

Kasir Digides Toko hari ini sudah berfungsi, tapi bekerja dengan cara **mengetik**: kasir mengetik sebagian nama produk, hasilnya tersaring, lalu ditekan. Untuk warung dengan 10 produk itu cukup. Untuk warung dengan 150 SKU rokok dan minuman, itu titik lambat yang membuat kasir kalah cepat dibanding mencatat di buku.

Yang diusulkan di sini ada empat, dan hanya empat:

1. **Barcode pada produk** — dipindai saat menambah produk, dipindai lagi saat menjual.
2. **Kategori produk** (Rokok, Minuman, dan seterusnya) — untuk menyaring cepat di kasir dan untuk laporan "rokok laku berapa bulan ini".
3. **Kasir mode pindai** — kamera menyala, pindai, langsung masuk keranjang.
4. **Modal & margin** — harga beli disimpan di samping harga jual, sehingga warung bisa tahu **untungnya**, bukan cuma omzetnya.

**Yang tidak diusulkan**: timbangan, harga bertingkat, diskon, promo, printer termal, multi-kasir. Semua itu menambah permukaan tanpa menjawab pertanyaan yang sedang diuji (§10 PRD Toko: apakah warung mau memakainya sama sekali).

---

## 1. Masalah nyata yang diselesaikan

Sebuah warung menjual "Djarum Super 12", "Djarum Super 16", "Djarum Black", "Djarum Coklat". Mengetik "djarum" memunculkan empat baris yang harus dibaca dan dibedakan — di layar HP, sambil pembeli menunggu, sering dalam cahaya redup. Barcode menghapus seluruh langkah itu: satu pindaian menunjuk **tepat satu** produk, tanpa ambiguitas dan tanpa membaca.

Kategori menyelesaikan masalah yang berbeda: **barang tanpa barcode**. Gorengan, es batu, kopi seduh, minyak curah — tidak ada barcode-nya, dan jumlahnya di warung tidak sedikit. Untuk itu kasir butuh jalan pintas visual, bukan pencarian teks.

Dua jalur ini saling melengkapi, dan keduanya perlu ada. Kasir yang hanya bisa memindai akan gagal di gorengan; kasir yang hanya bisa mencari teks akan lambat di rokok.

### Dan satu masalah ketiga: warung tidak tahu untungnya

Hari ini `store_products` hanya menyimpan **harga jual**. Tidak ada modal di mana pun — tidak di produk, tidak di baris pesanan. Akibatnya Riwayat Toko hanya bisa menjawab *"berapa jualan hari ini"*, tidak pernah *"berapa untung hari ini"* — padahal itu pertanyaan yang sebenarnya ditanyakan pemilik warung tiap tutup toko.

Yang membuat ini janggal: **sisi PPOB Digides sudah memisahkannya sejak awal.** Tabel `transactions` punya `base_price` (modal dari Digiflazz) *dan* `selling_price`, lengkap dengan menu Keuntungan untuk Super Admin. Toko justru tidak punya padanannya. Ini bukan fitur baru yang eksotis — ini menyamakan Toko dengan pola yang sudah terbukti di rumah sendiri.

---

## 2. Fondasi yang sudah ada

Sengaja diinventarisasi supaya tidak ada yang dibangun ulang.

| Kebutuhan | Sudah tersedia sebagai | Status |
|---|---|---|
| Pemindai kamera di aplikasi mitra | `QrScanScreen` (`mobile_scanner`), dipakai untuk nomor meter PLN dan QR pembayaran toko. Dibuat **tanpa batasan format**, jadi ia sudah membaca EAN-13/UPC barang kemasan hari ini — tidak perlu paket baru. | SUDAH ADA |
| Produk toko + stok + aktif/nonaktif | `store_products` + `store_inventory_events` | SUDAH ADA |
| Keranjang, total, QR bayar, struk | `store_orders`, `store_payment_requests`, `struk_pdf.dart` | SUDAH ADA |
| Pola modal vs harga jual | `transactions.base_price` / `selling_price` + menu Keuntungan — sudah berjalan bertahun-tahun di sisi PPOB, tinggal ditiru untuk Toko. | SUDAH ADA (di PPOB) |
| Kolom barcode pada produk | Belum ada. | BARU |
| Kategori produk | Belum ada. | BARU |
| Kasir mode pindai | Belum ada — kasir sekarang hanya cari-ketik. | BARU |
| Modal & margin produk toko | Belum ada. `store_products` hanya punya `price`; `store_order_items` hanya menyimpan `unit_price`. | BARU |

**Konsekuensi penting**: karena pemindainya sudah ada dan sudah terbukti di produksi, bagian tersulit fitur ini (izin kamera, siklus hidup controller, penanganan frame ganda) **sudah selesai dan sudah teruji**. Yang tersisa sebagian besar adalah data dan layar.

---

## 3. Ruang lingkup MVP

**Masuk MVP**

- Kolom `barcode` pada produk toko, diisi manual **atau** dengan memindai
- Pindai saat menambah produk: kamera → barcode terisi → tinggal isi nama, harga, stok
- Kategori produk dari daftar baku (Rokok, Minuman, Makanan Ringan, Sembako, Rumah Tangga, Lainnya)
- Kasir: tombol pindai; barang langsung masuk keranjang
- Kasir: baris tab kategori untuk barang tanpa barcode
- Barcode tidak dikenal → tawarkan "Tambah produk baru" dengan barcode sudah terisi
- **Modal (harga beli) pada produk**, opsional, dengan margin tampil langsung saat mengisi harga jual
- **Pembantu margin**: isi persen, harga jual terhitung sendiri dan dibulatkan ke kelipatan wajar
- Laporan **penjualan dan untung** per kategori di Riwayat Toko

**Sengaja di luar MVP**

- Timbangan / barang per kilogram (beras, gula curah) — butuh harga-per-satuan dan input berat; masalah yang berbeda
- Printer termal Bluetooth — struk sudah bisa dibagikan/dicetak lewat PDF
- Diskon, promo, harga grosir, harga member
- Multi-kasir / akun karyawan (sudah dinyatakan di luar MVP oleh PRD Toko)
- Katalog barcode bersama antar-toko (lihat §6.3 — ini keputusan besar tersendiri)
- Pemindai di web (lihat §6.4)
- Rata-rata modal bergerak / FIFO — modal dicatat per produk, bukan per batch pembelian

---

## 4. Perubahan skema

Melanjutkan penomoran migrasi yang ada (terakhir `050_store_settlement.sql`).

| Migrasi | Isi | Catatan penting |
|---|---|---|
| `051_store_product_barcode` | Tambah `store_products.barcode text`, indeks unik parsial **per toko** | Uniknya `(store_id, barcode)`, **bukan** global — lihat §6.1. Nullable, karena mayoritas barang warung tidak punya barcode. |
| `052_store_product_category` | Tabel `product_categories` (daftar baku), kolom `store_products.category_id` | Daftar baku dipakai bersama semua toko supaya laporan lintas-warung mungkin; lihat §6.2. Nullable → produk lama tetap valid tanpa migrasi data. |
| `053_store_product_cost` | Tambah `store_products.cost_price` dan `store_order_items.unit_cost` | Keduanya nullable — warung yang tidak mau mencatat modal tetap berjalan persis seperti sekarang. `unit_cost` **disalin saat checkout**, sama seperti `unit_price` sudah disalin; lihat §6.5 untuk alasannya. Margin tidak pernah disimpan, selalu dihitung. |

Ketiganya **hanya menambah kolom nullable**, tidak mengubah satu pun kolom yang ada, sehingga tidak menyentuh mesin pembayaran maupun ledger sama sekali.

---

## 5. Alur kasir yang baru

```
Kasir buka layar Kasir
   │
   ├── Mode Pindai (baru) ──► arahkan kamera ke barcode
   │        │
   │        ├── barcode dikenal   → produk masuk keranjang, jumlah +1, kamera tetap menyala
   │        └── barcode asing     → tanya: "Tambah produk baru?" (barcode sudah terisi)
   │
   ├── Tab Kategori (baru) ──► Rokok / Minuman / … → tekan produk
   │
   └── Cari nama (sudah ada) ──► ketik → tekan produk
   │
   ▼
Keranjang & total (sudah ada) → Buat QR → pembeli bayar → struk
```

**Tiga keputusan perilaku yang menentukan rasanya:**

1. **Kamera tidak menutup setelah satu pindaian.** Kasir memindai 5 barang berturut-turut tanpa membuka-tutup layar. Ini perbedaan terbesar antara terasa "seperti minimarket" dan terasa seperti aplikasi.
2. **Memindai barang yang sama dua kali menambah jumlah, bukan membuat baris kedua.** Dua bungkus rokok yang sama adalah satu baris "×2".
3. **Umpan balik tiap pindaian**: getar pendek + nama produk muncul sekejap. Di warung yang berisik, kasir tidak boleh perlu melihat layar untuk tahu pindaiannya berhasil.

Stok **tidak** berkurang saat memindai — pengurangan tetap terjadi saat pembayaran dikonfirmasi, persis aturan yang sudah berlaku (PRD Toko §5 langkah 6). Memindai hanya menyusun keranjang.

---

## 6. Keputusan yang harus diambil sebelum dikerjakan

Bagian ini yang paling penting. Salah memilih di sini akan mahal untuk diperbaiki setelah ada data nyata.

### 6.1 Barcode unik per toko, bukan global — **ini bukan pilihan, ini keharusan**

Dua warung berbeda sama-sama menjual Djarum Super, dan bungkusnya membawa EAN-13 yang **sama persis**. Kalau barcode dibuat unik secara global, warung kedua yang memindai produk itu akan ditolak sistem dengan alasan yang tidak masuk akal baginya.

**Keputusan: `UNIQUE (store_id, barcode)`.** Setiap toko punya ruang barcode-nya sendiri.

### 6.2 Kategori: daftar baku bersama, bukan teks bebas

Ada dua pilihan, dan keduanya masuk akal:

| Pilihan | Untung | Rugi |
|---|---|---|
| **Teks bebas per toko** | Warung menulis apa pun sesuai kebiasaannya | Laporan lintas-warung mustahil — "Rokok", "rokok", "ROKOK", "rokok/tembakau" jadi empat kategori berbeda |
| **Daftar baku bersama** (rekomendasi) | Laporan "kategori apa yang paling laku di warung Digides" jadi mungkin, dan pilihannya lebih cepat ditekan daripada diketik | Warung tidak bisa membuat kategori sendiri di MVP |

**Rekomendasi: daftar baku.** Enam kategori sudah menutup hampir semua isi warung, dan kemampuan menambah kategori sendiri bisa menyusul kapan saja tanpa migrasi data — sedangkan membersihkan teks bebas yang sudah telanjur kotor hampir mustahil.

### 6.3 Katalog barcode bersama — menggoda, dan sebaiknya ditunda

Idenya jelas: begitu satu warung memberi nama pada barcode Djarum Super, warung berikutnya yang memindainya cukup menerima nama itu. Hemat sekali, dan makin bernilai seiring bertambahnya toko.

Tapi ia membawa pertanyaan yang belum ada jawabannya: siapa yang memiliki data itu, apa yang terjadi kalau warung pertama salah menamai, bagaimana kalau dua warung tidak sepakat, dan apakah nama produk satu warung boleh terlihat oleh warung lain.

**Rekomendasi: tunda.** Simpan barcode per toko dulu. Kalau nanti terlihat banyak barcode yang sama muncul di banyak toko, data itu sendiri yang akan memberi tahu apakah katalog bersama layak dibangun — dan bagaimana bentuknya.

### 6.4 Ini fitur yang **Flutter lebih dulu**, dan itu melanggar kebiasaan proyek

Aturan proyek ini selama ini: **web adalah sumber kebenaran**, Flutter menyusul. Untuk fitur ini aturan itu tidak pas, dan alasannya jujur:

- Kasir warung dipakai **di HP**, sambil berdiri, satu tangan memegang barang.
- Pemindai kameranya **hanya ada di Flutter**. Web belum punya, dan membangunnya di browser adalah pekerjaan tersendiri dengan hasil yang lebih buruk.

**Rekomendasi**: backend dan skema tetap dikerjakan lebih dulu di `digides` (tetap sumber kebenaran untuk data dan API), tapi **layar mode pindai dibuat di Flutter lebih dulu**, dan web mendapat versi tanpa kamera (input barcode manual + tab kategori). Ini penyimpangan yang disengaja dan dicatat, bukan kelalaian.

### 6.5 Modal harus disalin saat checkout, bukan dibaca dari produk

Ini keputusan yang paling mudah salah, dan akibatnya baru terasa berbulan-bulan kemudian.

Harga modal berubah: rokok naik harga, warung memperbarui modalnya dari Rp18.000 jadi Rp19.500. Kalau laporan untung membaca **modal produk saat ini**, maka untung bulan lalu ikut berubah setiap kali modal diperbarui — laporan yang sudah dicetak kemarin tidak akan sama isinya hari ini. Itu bukan laporan, itu tebakan yang bergerak.

**Keputusan: salin `unit_cost` ke `store_order_items` saat pesanan dibuat**, persis seperti `unit_price` dan `product_name` yang sudah disalin di sana hari ini, dan persis seperti `transactions.base_price` yang sudah membekukan modal Digiflazz di sisi PPOB. Untung sebuah pesanan dihitung dari angka yang berlaku **saat transaksi itu terjadi**, dan tidak pernah berubah lagi setelahnya.

**Margin tidak pernah disimpan.** Ia selalu `harga jual − modal`. Menyimpan keduanya mengundang keduanya berbeda.

### 6.6 Cara mengisi: modal + harga jual, dengan persen sebagai pembantu

Pemilik warung berpikir dalam rupiah — *"beli 10 ribu, jual 12 ribu"* — bukan dalam persen. Jadi kolom utamanya adalah **Modal** dan **Harga Jual**, dan marginnya tampil hidup di bawahnya (`Untung Rp2.000 · 20%`).

Persen tetap berguna, tapi sebagai **pembantu, bukan sumber kebenaran**: ada tombol kecil "isi margin %", diketik `20`, harga jual terisi otomatis — lalu pemilik warung bebas menimpanya. Satu detail yang gampang terlewat: hasil hitungan persen menghasilkan angka seperti Rp11.640, sementara harga warung selalu bulat. **Bulatkan ke kelipatan Rp500 ke atas**, dan biarkan angkanya tetap bisa diedit.

Modal juga **boleh dikosongkan**. Warung yang tidak mau repot mencatat modal tetap berjualan seperti sekarang; produk tanpa modal hanya tidak ikut dihitung di laporan untung, dan itu dinyatakan apa adanya di layar — bukan ditampilkan sebagai untung Rp0, yang akan menyesatkan.

---

## 7. Sentuhan pada kode yang sudah jalan

| Berkas | Perubahan | Risiko |
|---|---|---|
| `store_products` | +3 kolom nullable (barcode, kategori, modal) | Rendah — tidak ada kolom lama yang berubah |
| `store_order_items` | +1 kolom nullable (`unit_cost`), disalin saat checkout | Rendah — kolom lama tetap, baris lama tetap valid |
| `store-product.service.ts` | Terima `barcode`, `categoryId`, `costPrice` saat buat/ubah | Rendah |
| `POST /api/store-orders` | **Tidak berubah** — kasir tetap mengirim `storeProductId` | Nol |
| Mesin pembayaran, ledger, stok | **Tidak disentuh sama sekali** | Nol |
| `QrScanScreen` (Flutter) | Dipakai ulang; perlu opsi "jangan tutup setelah satu pindaian" | Rendah — tambah parameter, perilaku lama tetap default |

Yang perlu digarisbawahi: **fitur ini tidak menyentuh satu baris pun kode yang memindahkan uang.** Barcode dan kategori hanya mempercepat cara sebuah `storeProductId` sampai ke keranjang; setelah itu alurnya identik dengan yang sudah berjalan dan sudah terbukti di produksi.

---

## 8. Kriteria penerimaan

- [ ] Memindai barcode barang yang terdaftar memasukkannya ke keranjang tanpa mengetik apa pun.
- [ ] Memindai barang yang sama dua kali menghasilkan satu baris berjumlah 2, bukan dua baris.
- [ ] Kamera tetap menyala setelah pindaian berhasil; 5 barang bisa dipindai berturut-turut tanpa membuka ulang layar.
- [ ] Memindai barcode yang belum terdaftar menawarkan pembuatan produk baru dengan barcode sudah terisi.
- [ ] Dua toko berbeda bisa mendaftarkan barcode yang sama persis tanpa saling mengganggu.
- [ ] Barang tanpa barcode tetap bisa dijual secepat sekarang, lewat tab kategori atau pencarian nama.
- [ ] Riwayat Toko bisa menjawab "berapa penjualan kategori Rokok bulan ini".
- [ ] Riwayat Toko bisa menjawab "berapa **untung** hari ini", bukan hanya omzetnya.
- [ ] Mengubah modal sebuah produk **tidak mengubah** angka untung pesanan yang sudah lewat.
- [ ] Produk tanpa modal tetap bisa dijual, dan dinyatakan apa adanya di laporan — bukan dihitung untung Rp0.
- [ ] Mengisi margin persen menghasilkan harga jual bulat yang masih bisa diedit.
- [ ] Menambahkan barcode dan kategori tidak mengubah satu pun perilaku pembayaran, ledger, atau stok yang sudah ada.

---

## 9. Urutan pengerjaan

**Tahap 1 — Data.** Migrasi 051, 052 & 053; endpoint produk menerima barcode, kategori, dan modal; daftar kategori baku di-seed; `unit_cost` ikut disalin saat pesanan dibuat.
Selesai bila: sebuah produk bisa disimpan dengan barcode, kategori, dan modal lewat API; dua toko bisa memakai barcode yang sama; dan mengubah modal produk tidak mengubah untung pesanan yang sudah lewat.

**Tahap 2 — Kelola produk.** Layar tambah/ubah produk (Flutter & web) menerima barcode, kategori, dan modal, dengan margin tampil hidup dan pembantu persen; di Flutter barcode bisa diisi dengan memindai.
Selesai bila: pemilik warung bisa mendaftarkan 10 produk berbarcode beserta modalnya dalam beberapa menit.

**Tahap 3 — Kasir mode pindai (Flutter).** Kamera menyala terus, pindai → keranjang, getar + nama sekejap, tangani barcode asing.
Selesai bila: satu transaksi 5 barang berbarcode selesai di bawah 20 detik.

**Tahap 4 — Tab kategori & laporan untung.** Baris tab kategori di kasir; rekap penjualan **dan untung** per kategori di Riwayat.
Selesai bila: barang tanpa barcode terjual sama cepatnya, dan pemilik warung bisa membaca untungnya hari itu — bukan cuma omzetnya.

---

## 10. Risiko

| Risiko | Dampak | Penanganan |
|---|---|---|
| Barcode dibuat unik global | Warung kedua ditolak saat menjual produk yang sama | Unik per toko sejak migrasi pertama (§6.1) — ini alasan keputusan itu ditulis lebih dulu |
| Kamera HP murah lambat/gagal fokus | Kasir kembali mengetik, fitur tak terpakai | Pencarian nama & tab kategori tetap ada berdampingan, bukan diganti |
| Warung malas mendaftarkan barcode | Manfaatnya tidak pernah terasa | Pendaftaran dibuat satu alur: pindai → nama → harga → simpan. Kalau tetap tidak dipakai, itu jawaban yang berguna untuk pilot §10 PRD Toko |
| Barang tanpa barcode terlupakan dalam desain | Kasir jadi lebih lambat untuk gorengan/es batu, yaitu barang yang justru paling sering | Tab kategori masuk MVP, bukan fase berikutnya |
| Modal dibaca dari produk, bukan disalin | Untung bulan lalu ikut berubah setiap modal diperbarui — laporan jadi angka yang bergerak | `unit_cost` disalin ke baris pesanan sejak migrasi pertama (§6.5) |
| Warung mengisi modal asal-asalan | Laporan untung menyesatkan, lebih buruk daripada tidak ada | Modal dibuat opsional dan produk tanpa modal dinyatakan apa adanya, bukan dihitung untung Rp0 |
| Fitur ini menunda uji coba warung nyata | Yang paling mahal — model bisnisnya belum tervalidasi | Pertimbangkan menjalankan pilot §10 lebih dulu dengan kasir yang ada; kalau warung memang memakainya, kasir pintar jadi jauh lebih layak dibangun |

---

## 11. Catatan penutup — apakah ini yang harus dikerjakan sekarang?

PRD Toko §10 meminta uji coba ke 5–10 warung nyata sebelum menambah fitur, dan hari ini uji itu belum berjalan. Kasir pintar akan membuat produknya lebih baik — tapi ia tidak menjawab pertanyaan yang belum terjawab: **apakah warung mau menerima saldo Digides sebagai pembayaran sama sekali.**

Kalau jawabannya ternyata tidak, kasir tercepat di dunia pun tidak menolong. Kalau jawabannya ya, dokumen ini sudah siap dikerjakan dan urutannya sudah jelas.

Rekomendasi jujur: **jalankan pilot dulu dengan kasir yang ada**, dan pakai keluhan nyata dari warung untuk menentukan apakah barcode benar-benar hambatan pertamanya — atau ada hal lain yang lebih mendesak yang belum terpikirkan di dokumen ini.
