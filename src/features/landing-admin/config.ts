import type { LandingSectionKind } from "@/types/landing";

/**
 * Formulir halaman admin disusun dari daftar di bawah ini, bukan ditulis
 * satu per satu per bagian.
 *
 * Alasannya sama dengan alasan tabelnya hanya tiga: menambah bagian baru
 * nanti tidak boleh berarti menulis komponen formulir baru. Cukup satu
 * baris di daftar ini, dan formulirnya muncul dengan sendirinya.
 */
export type JenisLadang = "teks" | "panjang" | "angka" | "gambar";

export interface Ladang {
  /** Nama kolom di tabel, atau `settings.<nama>` untuk yang tersimpan di jsonb. */
  nama: string;
  label: string;
  jenis: JenisLadang;
  petunjuk?: string;
}

/** Kolom yang bisa diisi untuk tiap jenis bagian. */
export const LADANG_BAGIAN: Record<LandingSectionKind, Ladang[]> = {
  situs: [
    { nama: "title", label: "Nama merek", jenis: "teks", petunjuk: "Kata pertama tampil hitam, sisanya merah. Contoh: DIGIDES PAY" },
    { nama: "body", label: "Slogan", jenis: "teks" },
    { nama: "script_text", label: "Tulisan tangan di kaki halaman", jenis: "teks" },
    { nama: "settings.seo_title", label: "Judul di tab & hasil pencarian", jenis: "teks" },
    { nama: "settings.seo_description", label: "Keterangan di hasil pencarian", jenis: "panjang", petunjuk: "Sekitar 150-160 huruf. Inilah kalimat yang dibaca orang di Google." },
    { nama: "settings.hak_cipta", label: "Teks hak cipta", jenis: "teks", petunjuk: "Tahunnya ditambahkan otomatis." },
    { nama: "settings.tombol_masuk", label: "Label tombol Masuk", jenis: "teks" },
    { nama: "settings.url_masuk", label: "Alamat tombol Masuk", jenis: "teks" },
    { nama: "settings.tombol_daftar", label: "Label tombol Daftar", jenis: "teks" },
    { nama: "settings.url_daftar", label: "Alamat tombol Daftar", jenis: "teks" },
    { nama: "settings.wa_nomor", label: "Nomor WhatsApp", jenis: "teks", petunjuk: "Contoh: 081234567890 atau 6281234567890. Kosongkan untuk menyembunyikan tombol WhatsApp." },
    { nama: "settings.wa_label", label: "Tulisan di tombol WhatsApp", jenis: "teks" },
    { nama: "settings.wa_pesan", label: "Pesan yang sudah terisi", jenis: "panjang", petunjuk: "Muncul otomatis di kolom ketik WhatsApp, supaya orang tidak bingung harus menulis apa." },
  ],

  navigasi: [],

  hero: [
    { nama: "eyebrow", label: "Penanda kecil di atas judul", jenis: "teks" },
    { nama: "title", label: "Judul baris pertama", jenis: "teks" },
    { nama: "title_accent", label: "Judul baris kedua (merah)", jenis: "teks" },
    { nama: "body", label: "Kalimat pengantar", jenis: "panjang" },
    { nama: "media_id", label: "Foto utama", jenis: "gambar" },
    { nama: "settings.tombol_utama", label: "Tombol utama", jenis: "teks" },
    { nama: "settings.tombol_utama_url", label: "Alamat tombol utama", jenis: "teks" },
    { nama: "settings.tombol_kedua", label: "Tombol kedua", jenis: "teks", petunjuk: "Kosongkan untuk menyembunyikan tombolnya." },
    { nama: "settings.tombol_kedua_url", label: "Alamat tombol kedua", jenis: "teks" },
    { nama: "settings.kartu_judul", label: "Kartu melayang di atas foto", jenis: "panjang", petunjuk: "Tiap baris baru menjadi baris tersendiri." },
    { nama: "settings.pita_tangan", label: "Tulisan tangan di pojok foto", jenis: "panjang" },
    { nama: "script_text", label: "Tulisan tangan di bawah tombol", jenis: "panjang" },
  ],

  narasi: [
    { nama: "eyebrow", label: "Penanda kecil", jenis: "teks" },
    { nama: "title", label: "Judul baris pertama", jenis: "teks" },
    { nama: "title_accent", label: "Judul baris kedua (merah)", jenis: "teks" },
    { nama: "body", label: "Kalimat utama", jenis: "panjang" },
    { nama: "body_secondary", label: "Kalimat kedua (lebih kecil)", jenis: "panjang" },
    { nama: "quote", label: "Kutipan dalam kotak", jenis: "panjang" },
    { nama: "media_id", label: "Foto pendukung", jenis: "gambar" },
  ],

  kartu: [{ nama: "eyebrow", label: "Penanda kecil di atas kartu", jenis: "teks" }],

  pergeseran: [
    { nama: "body", label: "Kalimat pertama (abu-abu)", jenis: "panjang" },
    { nama: "body_secondary", label: "Kalimat kedua, bagian putih", jenis: "teks" },
    { nama: "settings.sorotan", label: "Kalimat kedua, bagian emas", jenis: "teks" },
    { nama: "script_text", label: "Tulisan tangan di kanan", jenis: "panjang" },
  ],

  solusi: [
    { nama: "eyebrow", label: "Penanda kecil", jenis: "teks" },
    { nama: "title", label: "Judul (hitam)", jenis: "panjang" },
    { nama: "title_accent", label: "Judul (merah)", jenis: "teks" },
    { nama: "body", label: "Kalimat pengantar", jenis: "panjang" },
    { nama: "script_text", label: "Tulisan tangan", jenis: "panjang" },
    { nama: "settings.judul_manfaat", label: "Judul daftar manfaat", jenis: "teks" },
    { nama: "settings.saldo_contoh", label: "Saldo contoh di layar HP", jenis: "teks" },
    { nama: "settings.catatan_hp", label: "Catatan di bawah layar HP", jenis: "teks" },
  ],

  kalkulator: [
    { nama: "eyebrow", label: "Penanda kecil", jenis: "teks" },
    { nama: "title", label: "Judul baris pertama", jenis: "teks" },
    { nama: "title_accent", label: "Judul baris kedua (merah)", jenis: "teks" },
    { nama: "body", label: "Kalimat pengantar", jenis: "panjang" },
    { nama: "settings.label_penduduk", label: "Label kolom penduduk", jenis: "teks" },
    { nama: "settings.label_rumah", label: "Label kolom rumah", jenis: "teks" },
    { nama: "settings.label_hp", label: "Label kolom pengguna HP", jenis: "teks" },
    { nama: "settings.label_persen", label: "Label penggeser persentase", jenis: "teks" },
    { nama: "settings.penduduk", label: "Nilai awal penduduk", jenis: "angka" },
    { nama: "settings.rumah", label: "Nilai awal rumah", jenis: "angka" },
    { nama: "settings.hp", label: "Nilai awal pengguna HP", jenis: "angka" },
    { nama: "settings.persen", label: "Nilai awal persentase", jenis: "angka" },
    { nama: "settings.catatan", label: "Catatan kejujuran", jenis: "panjang", petunjuk: "Kalimat 'Ini perkiraan, bukan janji.' sudah dipasang otomatis di depannya." },
    { nama: "settings.tombol", label: "Label tombol", jenis: "teks" },
    { nama: "settings.tombol_url", label: "Alamat tombol", jenis: "teks" },
  ],

  langkah: [
    { nama: "title", label: "Judul", jenis: "teks" },
    { nama: "body", label: "Kalimat pengantar", jenis: "panjang" },
    { nama: "script_text", label: "Tulisan tangan di kanan", jenis: "panjang" },
  ],

  profil: [
    { nama: "eyebrow", label: "Penanda kecil", jenis: "teks" },
    { nama: "title", label: "Judul (hitam)", jenis: "teks" },
    { nama: "title_accent", label: "Judul (merah)", jenis: "teks" },
    { nama: "body", label: "Kalimat pengantar", jenis: "panjang" },
  ],

  penutup: [
    { nama: "title", label: "Judul", jenis: "panjang" },
    { nama: "body", label: "Kalimat pengantar", jenis: "panjang" },
    { nama: "script_text", label: "Tulisan tangan di kanan", jenis: "panjang" },
  ],

  faq: [
    { nama: "title", label: "Judul", jenis: "teks" },
    { nama: "body", label: "Kalimat pengantar", jenis: "teks" },
  ],

  kaki: [
    { nama: "title", label: "Ajakan terakhir", jenis: "panjang" },
    { nama: "body", label: "Kalimat di bawah ajakan", jenis: "teks" },
    { nama: "settings.catatan_legal", label: "Catatan dokumen legal", jenis: "panjang" },
  ],
};

/** Satu daftar butir di dalam sebuah bagian. */
export interface KelompokButir {
  grup: string;
  judul: string;
  keterangan?: string;
  labelTambah: string;
  ladang: Ladang[];
  /** Batas jumlah butir, kalau rancangannya memang hanya muat sekian. */
  maksimal?: number;
}

export const KELOMPOK_BUTIR: Record<LandingSectionKind, KelompokButir[]> = {
  situs: [],

  navigasi: [
    {
      grup: "utama",
      judul: "Tautan menu",
      keterangan:
        "Muncul di menu atas, laci menu HP, dan kaki halaman. Alamat yang diawali # menuju bagian di halaman ini.",
      labelTambah: "Tambah tautan",
      ladang: [
        { nama: "title", label: "Label", jenis: "teks" },
        { nama: "link_url", label: "Alamat", jenis: "teks", petunjuk: "Contoh: #manfaat atau /login" },
      ],
    },
  ],

  hero: [
    {
      grup: "utama",
      judul: "Daftar centang",
      labelTambah: "Tambah centang",
      ladang: [{ nama: "title", label: "Teks", jenis: "teks" }],
    },
  ],

  narasi: [
    {
      grup: "utama",
      judul: "Gelembung keluhan",
      keterangan: "Mengelilingi foto. Empat butir adalah jumlah yang pas; lebih dari itu mulai bertumpuk.",
      labelTambah: "Tambah gelembung",
      ladang: [
        { nama: "title", label: "Teks", jenis: "teks" },
        { nama: "icon", label: "Ikon", jenis: "teks" },
      ],
      maksimal: 4,
    },
  ],

  kartu: [
    {
      grup: "utama",
      judul: "Kartu",
      labelTambah: "Tambah kartu",
      ladang: [
        { nama: "title", label: "Judul kartu", jenis: "teks" },
        { nama: "body", label: "Isi kartu", jenis: "panjang" },
        { nama: "media_id", label: "Foto kartu", jenis: "gambar" },
      ],
    },
  ],

  pergeseran: [
    {
      grup: "utama",
      judul: "Lencana",
      labelTambah: "Tambah lencana",
      ladang: [{ nama: "title", label: "Teks", jenis: "teks" }],
    },
  ],

  solusi: [
    {
      grup: "centang",
      judul: "Daftar centang",
      labelTambah: "Tambah centang",
      ladang: [{ nama: "title", label: "Teks", jenis: "teks" }],
    },
    {
      grup: "manfaat",
      judul: "Apa yang Anda dapatkan",
      labelTambah: "Tambah manfaat",
      ladang: [
        { nama: "title", label: "Judul", jenis: "teks" },
        { nama: "body", label: "Keterangan", jenis: "panjang" },
        { nama: "icon", label: "Ikon", jenis: "teks" },
      ],
    },
  ],

  kalkulator: [
    {
      grup: "utama",
      judul: "Layanan yang dihitung",
      keterangan:
        "Tiap layanan berjalan sendiri lalu dijumlahkan. Dasar 'rumah' untuk layanan yang melekat pada rumah (token listrik), 'hp' untuk yang melekat pada orang (pulsa).",
      labelTambah: "Tambah layanan",
      ladang: [
        { nama: "title", label: "Nama layanan", jenis: "teks" },
        { nama: "body", label: "Keterangan dasarnya", jenis: "panjang" },
        { nama: "icon", label: "Ikon", jenis: "teks" },
        { nama: "data.basis", label: "Dasar hitungan", jenis: "teks", petunjuk: "rumah atau hp" },
        { nama: "data.satuan", label: "Satuan", jenis: "teks", petunjuk: "rumah atau orang" },
        { nama: "data.warna", label: "Warna batang", jenis: "teks", petunjuk: "merah atau emas" },
        { nama: "data.fee", label: "Fee awal (Rp)", jenis: "angka" },
        { nama: "data.frekuensi", label: "Beli per bulan (awal)", jenis: "angka" },
      ],
    },
  ],

  langkah: [
    {
      grup: "utama",
      judul: "Langkah",
      keterangan: "Nomornya diberikan otomatis mengikuti urutan.",
      labelTambah: "Tambah langkah",
      ladang: [
        { nama: "title", label: "Judul langkah", jenis: "teks" },
        { nama: "body", label: "Keterangan", jenis: "panjang" },
      ],
    },
  ],

  profil: [
    {
      grup: "utama",
      judul: "Orang",
      keterangan:
        "Semua profil memakai tampilan kartu yang sama. Menambah konsultan IT, komisaris, atau siapa pun cukup dari sini.",
      labelTambah: "Tambah profil",
      ladang: [
        { nama: "title", label: "Nama", jenis: "teks" },
        { nama: "subtitle", label: "Jabatan", jenis: "teks", petunjuk: "Contoh: Direktur Utama, Konsultan IT" },
        { nama: "body", label: "Keterangan singkat", jenis: "panjang" },
        { nama: "media_id", label: "Foto", jenis: "gambar", petunjuk: "Paling bagus foto tegak (potrait)." },
        { nama: "link_label", label: "Label tautan", jenis: "teks", petunjuk: "Opsional. Contoh: LinkedIn" },
        { nama: "link_url", label: "Alamat tautan", jenis: "teks" },
      ],
    },
  ],

  penutup: [
    {
      grup: "utama",
      judul: "Manfaat",
      labelTambah: "Tambah manfaat",
      ladang: [
        { nama: "title", label: "Teks", jenis: "teks", petunjuk: "Boleh dua baris." },
        { nama: "icon", label: "Ikon", jenis: "teks" },
      ],
    },
  ],

  faq: [
    {
      grup: "utama",
      judul: "Pertanyaan",
      keterangan: "Jawabannya harus benar menurut keadaan sistem hari ini, bukan menurut rencana.",
      labelTambah: "Tambah pertanyaan",
      ladang: [
        { nama: "title", label: "Pertanyaan", jenis: "teks" },
        { nama: "body", label: "Jawaban", jenis: "panjang" },
      ],
    },
  ],

  kaki: [],
};

/** Nama yang enak dibaca untuk tiap bagian di daftar halaman admin. */
export const JUDUL_BAGIAN: Record<string, string> = {
  situs: "Identitas Situs",
  navigasi: "Menu",
  hero: "Pembuka",
  realita: "Realita di Lapangan",
  masalah: "Kartu Masalah",
  pergeseran: "Pergeseran Cara Pandang",
  solusi: "Solusi",
  kalkulator: "Kalkulator Potensi",
  langkah: "Cara Memulai",
  profil: "Profil Perusahaan",
  "masa-depan": "Masa Depan Desa",
  faq: "Tanya Jawab",
  kaki: "Kaki Halaman",
};
