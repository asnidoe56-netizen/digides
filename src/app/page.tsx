import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Fingerprint,
  Handshake,
  Receipt,
  ShieldCheck,
  Smartphone,
  Store,
  Timer,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { DownloadAppButton } from "@/features/landing/components/download-app-button";
import { LogoDenganNama } from "@/features/landing/components/logo-digides";

// Halaman depan tidak menyentuh basis data sama sekali.
//
// Ini bukan penghematan, tapi keputusan: alamat utama yang sudah diketik
// orang dan dibagikan di grup desa tidak boleh ikut mati ketika basis data
// sedang sibuk memproses transaksi. Nomor versi APK yang memang berubah
// diambil belakangan oleh tombol unduhnya sendiri.
export const dynamic = "force-static";

const LAYANAN = [
  {
    icon: Smartphone,
    nama: "Pulsa & Paket Data",
    catatan: "Semua operator, harga yang sama untuk seluruh mitra.",
  },
  {
    icon: Zap,
    nama: "Token Listrik",
    catatan: "Nomor token muncul di layar dan tersimpan di riwayat.",
  },
  {
    icon: Receipt,
    nama: "Bayar Tagihan",
    catatan: "PLN pascabayar, PDAM, BPJS, dan internet rumah.",
  },
  {
    icon: Wallet,
    nama: "Isi Saldo E-Wallet",
    catatan: "Dana, GoPay, OVO, ShopeePay, dan LinkAja.",
  },
  {
    icon: Store,
    nama: "Kasir Toko",
    catatan: "Catat penjualan barang warung di aplikasi yang sama.",
  },
  {
    icon: BarChart3,
    nama: "Laporan & Komisi",
    catatan: "Rekap harian yang bisa dibuka kapan saja, bukan dicatat manual.",
  },
];

const MASALAH = [
  "Modal desa sudah cair, tapi tidak berkembang",
  "Unit usaha berdiri di atas kertas, tidak berjalan",
  "Pengelolaan tidak tertata, pencatatan tercecer",
  "Pendapatan asli desa tidak bertambah",
  "Laporan sulit disusun saat musyawarah desa",
  "Kepercayaan warga pelan-pelan menurun",
];

const LANGKAH = [
  {
    judul: "Daftar",
    isi: "Lengkapi data BUMDes atau konter Anda. Tidak ada biaya pendaftaran.",
  },
  {
    judul: "Isi saldo",
    isi: "Transfer ke rekening yang tertera di aplikasi. Saldo masuk otomatis setelah pembayaran terverifikasi.",
  },
  {
    judul: "Mulai melayani warga",
    isi: "Setiap transaksi tercatat, dan keuntungannya langsung menambah saldo Anda.",
  },
];

const ALASAN = [
  {
    icon: BarChart3,
    judul: "Tercatat rapi",
    isi: "Setiap transaksi punya riwayat dan laporan yang bisa ditunjukkan ke musyawarah desa — tanpa menyalin ulang ke buku.",
  },
  {
    icon: Fingerprint,
    judul: "Uang aman",
    isi: "Setiap pembelian dikunci PIN atau sidik jari. Kalau transaksi gagal, saldo yang ditahan kembali dengan sendirinya.",
  },
  {
    icon: Timer,
    judul: "Cepat",
    isi: "Token listrik dan pulsa umumnya sampai dalam hitungan detik, bukan menit.",
  },
  {
    icon: Handshake,
    judul: "Tidak ditinggal sendiri",
    isi: "Ada panduan langkah demi langkah di dalam aplikasi, dan admin yang bisa dihubungi lewat menu Bantuan.",
  },
];

const UNTUK_SIAPA = [
  {
    icon: Building2,
    judul: "BUMDes",
    isi: "Unit usaha yang bisa jalan hari ini juga, tanpa gudang, tanpa stok, tanpa menambah pegawai.",
  },
  {
    icon: Store,
    judul: "Konter & agen",
    isi: "Satu aplikasi untuk pulsa, token, tagihan, dan kasir — menggantikan tiga aplikasi yang berbeda.",
  },
  {
    icon: Users,
    judul: "Pengurus desa",
    isi: "Angka yang bisa dipertanggungjawabkan saat ditanya warga, siap dicetak jadi laporan.",
  },
];

const TANYA_JAWAB = [
  {
    tanya: "Berapa modal awalnya?",
    jawab:
      "Tidak ada biaya pendaftaran dan tidak ada setoran wajib. Modalnya adalah saldo yang Anda isi sendiri, dan besarnya Anda yang menentukan. Banyak mitra memulai dari jumlah kecil lalu menambah setelah melihat perputarannya.",
  },
  {
    tanya: "Apakah ada biaya bulanan?",
    jawab:
      "Tidak ada. Digides mengambil bagian dari selisih harga pada setiap transaksi yang berhasil, bukan dari iuran. Kalau Anda tidak bertransaksi, Anda tidak membayar apa pun.",
  },
  {
    tanya: "Bagaimana keuntungannya dihitung?",
    jawab:
      "Setiap produk punya harga modal dan harga jual. Selisihnya menjadi keuntungan Anda dan langsung menambah saldo begitu transaksi berhasil. Rinciannya per transaksi bisa dibuka di menu Laporan.",
  },
  {
    tanya: "Bagaimana kalau transaksi gagal?",
    jawab:
      "Saldo yang ditahan saat pembelian dikembalikan otomatis. Setiap perubahan saldo punya catatannya sendiri di menu Histori, sehingga selisih sekecil apa pun bisa ditelusuri.",
  },
  {
    tanya: "Apakah datanya aman?",
    jawab:
      "Setiap pembelian butuh PIN transaksi atau sidik jari, terpisah dari kata sandi masuk. Kata sandi dan PIN disimpan dalam bentuk teracak, dan tidak pernah ikut dalam salinan data yang diunduh admin.",
  },
  {
    tanya: "Bagaimana cara menarik keuntungan ke rekening?",
    jawab:
      "Penarikan dana ke rekening bank masih dalam pengembangan dan belum bisa dipakai. Saat ini keuntungan tersimpan sebagai saldo dan dapat dipakai untuk transaksi berikutnya. Begitu fitur ini siap, pengumumannya akan muncul di dalam aplikasi.",
  },
];

export default function HomePage() {
  return (
    <div className="bg-white text-neutral-900">
      {/* ── Pembuka ─────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden bg-neutral-950 text-white">
        {/* Cahaya merah samar, sengaja tanpa gambar: halaman ini dibuka dari
            HP dengan sinyal desa, dan setiap kilobita punya harganya. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 size-152 -translate-x-1/2 rounded-full bg-red-600/25 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-5 py-5">
          <div className="flex items-center justify-between gap-4">
            <LogoDenganNama size={40} priority />
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:text-white"
            >
              Masuk
            </Link>
          </div>
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pb-28">
          <div>
            {/* Garis emas tipis — satu-satunya emas di bagian ini. */}
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 px-3 py-1 text-xs font-medium tracking-wide text-amber-300">
              <span className="size-1.5 rounded-full bg-amber-400" />
              Untuk BUMDes, konter, dan agen desa
            </span>

            <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">
              Jadikan BUMDes sumber pendapatan desa.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-neutral-300">
              Pulsa, token listrik, tagihan, dan isi saldo e-wallet — layanan yang dicari
              warga setiap hari, dijual dari warung Anda sendiri. Satu aplikasi, satu saldo,
              semuanya tercatat.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-start">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-linear-to-b from-red-500 to-red-700 px-6 text-base font-semibold text-white shadow-lg shadow-red-900/40 transition-opacity hover:opacity-95"
              >
                Daftar Jadi Mitra
                <ArrowRight className="size-5" />
              </Link>
              <DownloadAppButton />
            </div>
          </div>

          <TampilanAplikasi />
        </div>
      </header>

      {/* ── Masalah yang dikenali sendiri ────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <h2 className="max-w-2xl text-balance text-2xl font-bold sm:text-3xl">
          Kalau yang di bawah ini terasa seperti desa Anda, Anda tidak sendirian.
        </h2>
        <ul className="mt-8 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {MASALAH.map((masalah) => (
            <li
              key={masalah}
              className="flex items-start gap-3 border-l-2 border-neutral-200 py-1 pl-4 text-[15px] leading-relaxed text-neutral-700"
            >
              {masalah}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Layanan ─────────────────────────────────────────────────────── */}
      <section className="border-y border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
          <h2 className="text-balance text-2xl font-bold sm:text-3xl">
            Yang bisa Anda jual mulai hari pertama
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-600">
            Tidak ada stok yang harus dibeli dan tidak ada barang yang bisa kedaluwarsa.
            Modalnya satu: saldo.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LAYANAN.map((layanan) => (
              <div
                key={layanan.nama}
                className="rounded-2xl border border-neutral-200 bg-white p-5"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <layanan.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{layanan.nama}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
                  {layanan.catatan}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tiga langkah ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <h2 className="text-balance text-2xl font-bold sm:text-3xl">Cara kerjanya</h2>

        {/* Bernomor karena memang berurutan: isi saldo tidak bisa mendahului
            pendaftaran, dan melayani warga tidak bisa mendahului saldo. */}
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {LANGKAH.map((langkah, index) => (
            <li key={langkah.judul}>
              <div className="flex items-center gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-neutral-950 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="text-lg font-semibold">{langkah.judul}</h3>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">{langkah.isi}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Kenapa Digides ──────────────────────────────────────────────── */}
      <section className="border-y border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
          <h2 className="text-balance text-2xl font-bold sm:text-3xl">Kenapa Digides</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {ALASAN.map((alasan) => (
              <div key={alasan.judul} className="flex gap-4">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-b from-red-500 to-red-700 text-white">
                  <alasan.icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{alasan.judul}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-600">
                    {alasan.isi}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Untuk siapa ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <h2 className="text-balance text-2xl font-bold sm:text-3xl">Cocok untuk</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {UNTUK_SIAPA.map((sasaran) => (
            <div key={sasaran.judul} className="rounded-2xl border border-neutral-200 p-6">
              <sasaran.icon className="size-6 text-red-600" />
              <h3 className="mt-4 text-lg font-semibold">{sasaran.judul}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">{sasaran.isi}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cara memasang APK ───────────────────────────────────────────── */}
      <section className="border-y border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <h2 className="text-balance text-2xl font-bold sm:text-3xl">
                Cara memasang aplikasinya
              </h2>
              {/* Ditulis apa adanya. Peringatan Android saat memasang berkas di
                  luar Play Store membuat sebagian orang berhenti di tengah
                  jalan dan mengira aplikasinya berbahaya. */}
              <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">
                Aplikasi mitra dibagikan langsung sebagai berkas APK. Saat memasangnya,
                Android akan menampilkan peringatan &ldquo;sumber tidak dikenal&rdquo; — itu
                muncul untuk setiap aplikasi yang dipasang di luar Play Store, dan bukan
                tanda ada yang salah.
              </p>
              <ol className="mt-6 space-y-3 text-[15px] text-neutral-700">
                {[
                  "Tekan Unduh Aplikasi, lalu tunggu unduhannya selesai.",
                  "Buka berkasnya dari notifikasi atau folder Unduhan.",
                  "Saat diminta, izinkan pemasangan dari sumber ini.",
                  "Buka aplikasinya dan masuk dengan akun yang sudah didaftarkan.",
                ].map((langkah, index) => (
                  <li key={langkah} className="flex gap-3">
                    <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-700">
                      {index + 1}
                    </span>
                    {langkah}
                  </li>
                ))}
              </ol>
              <div className="mt-8">
                <DownloadAppButton variant="gelap" />
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <ShieldCheck className="size-6 text-red-600" />
              <h3 className="mt-4 font-semibold">Butuh HP seperti apa?</h3>
              <ul className="mt-4 space-y-2.5 text-[15px] text-neutral-600">
                {[
                  "HP Android biasa, tidak perlu yang baru",
                  "Ruang penyimpanan kosong sekitar 100 MB",
                  "Jaringan internet saat bertransaksi",
                  "Belum tersedia untuk iPhone",
                ].map((syarat) => (
                  <li key={syarat} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-neutral-400" />
                    {syarat}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tanya jawab ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-5 py-16 lg:py-20">
        <h2 className="text-balance text-2xl font-bold sm:text-3xl">
          Pertanyaan yang sering ditanyakan
        </h2>
        {/* <details> asli, bukan akordeon buatan sendiri: tetap bisa dibuka
            tanpa JavaScript, dan isinya terbaca oleh mesin pencari. */}
        <div className="mt-8 divide-y divide-neutral-200 border-y border-neutral-200">
          {TANYA_JAWAB.map((item) => (
            <details key={item.tanya} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold marker:hidden">
                {item.tanya}
                <span
                  aria-hidden
                  className="text-xl leading-none text-neutral-400 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">{item.jawab}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Penutup dan kaki halaman ────────────────────────────────────── */}
      <footer className="relative overflow-hidden bg-neutral-950 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-48 left-1/2 size-136 -translate-x-1/2 rounded-full bg-red-600/20 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-5 py-16 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-extrabold sm:text-4xl">
              Mulai dari satu transaksi hari ini.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-neutral-300">
              Pendaftaran gratis. Saldo pertama boleh sekecil apa pun.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:items-start">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-linear-to-b from-red-500 to-red-700 px-6 text-base font-semibold text-white shadow-lg shadow-red-900/40 transition-opacity hover:opacity-95"
              >
                Daftar Jadi Mitra
                <ArrowRight className="size-5" />
              </Link>
              <DownloadAppButton />
            </div>
          </div>

          <div className="mt-16 flex flex-col gap-6 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <LogoDenganNama size={40} />
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-400">
              <Link href="/login" className="transition-colors hover:text-white">
                Masuk
              </Link>
              <Link href="/register" className="transition-colors hover:text-white">
                Daftar
              </Link>
              <a href="/api/app/download" className="transition-colors hover:text-white">
                Unduh Aplikasi
              </a>
            </div>
          </div>

          {/* Syarat & Ketentuan, Kebijakan Privasi, dan Kebijakan Refund sudah
              ada isinya di dalam aplikasi. Menautkannya di sini sebelum
              halaman webnya benar-benar ada hanya akan menghasilkan tautan
              yang mati, jadi yang disebut adalah tempat yang benar-benar
              memuatnya hari ini. */}
          <p className="mt-8 text-xs leading-relaxed text-neutral-500">
            Syarat &amp; Ketentuan, Kebijakan Privasi, dan Kebijakan Refund dapat dibaca di
            dalam aplikasi melalui menu Akun.
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            © {new Date().getFullYear()} DIGIDESPAY. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

/**
 * Gambaran layar Beranda aplikasi, digambar dengan CSS.
 *
 * Bukan tangkapan layar sungguhan, dan itu disengaja: tangkapan layar berisi
 * saldo dan nomor pelanggan mitra yang nyata, dan gambar seperti itu tidak
 * boleh terpasang di halaman yang dibaca publik. Angka di bawah ini contoh,
 * dan tertulis demikian.
 */
function TampilanAplikasi() {
  const ikon = [
    { icon: Smartphone, nama: "Pulsa" },
    { icon: Zap, nama: "Token" },
    { icon: Receipt, nama: "Tagihan" },
    { icon: Wallet, nama: "E-Wallet" },
    { icon: Store, nama: "Toko" },
    { icon: BarChart3, nama: "Laporan" },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="w-65 rounded-4xl border-[6px] border-neutral-800 bg-white shadow-2xl shadow-black/50">
        <div className="rounded-t-[1.6rem] bg-linear-to-b from-red-500 to-red-700 px-5 pb-8 pt-5 text-white">
          <p className="text-[11px] text-white/70">Saldo Utama</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">Rp 1.250.000</p>
        </div>

        <div className="-mt-5 px-4">
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
            {ikon.map((item) => (
              <div key={item.nama} className="flex flex-col items-center gap-1.5 py-1">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <item.icon className="size-4" />
                </span>
                <span className="text-[9px] text-neutral-600">{item.nama}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-4">
          <p className="text-[10px] font-semibold text-neutral-400">TRANSAKSI TERAKHIR</p>
          <div className="mt-2 space-y-2">
            {[
              { nama: "Token Listrik 50.000", nilai: "−Rp 51.500" },
              { nama: "Pulsa Telkomsel 25.000", nilai: "−Rp 25.800" },
            ].map((baris) => (
              <div key={baris.nama} className="flex items-center justify-between gap-2">
                <span className="truncate text-[10px] text-neutral-700">{baris.nama}</span>
                <span className="shrink-0 text-[10px] font-medium tabular-nums text-neutral-500">
                  {baris.nilai}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-neutral-500">Contoh tampilan — angka bukan data nyata</p>
    </div>
  );
}
