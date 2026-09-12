import Image from "next/image";
import { Caveat, Plus_Jakarta_Sans } from "next/font/google";
import { ArrowRight, BarChart3, Brain, Receipt, Smartphone, Store, Wallet, Zap } from "lucide-react";
import {
  ambilHalamanDepan,
  angkaData,
  butirKelompok,
  pengaturan,
  urlGambar,
} from "@/services/landing.service";
import type { LandingMedia, LandingSectionFull } from "@/types/landing";
import { Ikon } from "@/features/landing/components/ikon";
import { Kalkulator, type LayananHitung } from "@/features/landing/components/kalkulator";
import { KepalaHalaman } from "@/features/landing/components/kepala-halaman";
import { TombolWhatsapp } from "@/features/landing/components/tombol-whatsapp";
import "@/features/landing/landing.css";
import "@/features/landing/landing-kalkulator.css";

/**
 * Halaman depan disajikan dari cache dan disegarkan tiap sepuluh menit.
 *
 * Isinya datang dari basis data supaya bisa diubah tanpa membongkar kode,
 * tapi alamat utama yang dibagikan di grup desa tidak boleh ikut melambat
 * setiap kali seseorang membukanya. Perubahan dari halaman admin tidak
 * menunggu sepuluh menit itu: tiap penyimpanan memanggil revalidatePath("/")
 * sehingga halamannya disusun ulang saat itu juga.
 */
export const revalidate = 600;

// Huruf buatan Indonesia, dipesan untuk kota Jakarta. Dipakai di sini bukan
// karena bentuknya kebetulan cocok, tapi karena halaman yang mengajak desa
// Indonesia sebaiknya ditulis dengan huruf yang lahir di sini juga.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// Satu-satunya tugasnya memegang tulisan tangan di enam tempat.
const caveat = Caveat({ subsets: ["latin"], weight: ["600", "700"], display: "swap" });

const LOGO = "/logos/digidespay.jpg";

export async function generateMetadata() {
  const { byKey } = await ambilHalamanDepan();
  const situs = byKey.situs;
  const judul = pengaturan(situs, "seo_title", "DIGIDES PAY");
  const keterangan = pengaturan(situs, "seo_description", "");

  return {
    title: { absolute: judul },
    description: keterangan,
    openGraph: {
      title: judul,
      description: keterangan,
      type: "website" as const,
      locale: "id_ID",
      images: [{ url: LOGO, width: 1200, height: 630, alt: "DIGIDES PAY" }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: judul,
      description: keterangan,
      images: [LOGO],
    },
  };
}

export default async function HomePage() {
  const { byKey } = await ambilHalamanDepan();
  const situs = byKey.situs;

  const namaLengkap = situs?.title ?? "DIGIDES PAY";
  const [namaMerek, ...sisa] = namaLengkap.split(" ");
  const aksenMerek = sisa.join(" ") || "PAY";

  const menu = butirKelompok(byKey.navigasi).map((butir) => ({
    id: butir.id,
    label: butir.title ?? "",
    url: butir.link_url ?? "#",
  }));

  const labelMasuk = pengaturan(situs, "tombol_masuk", "Masuk");
  const urlMasuk = pengaturan(situs, "url_masuk", "/login");
  const labelDaftar = pengaturan(situs, "tombol_daftar", "Daftar Jadi Mitra");
  const urlDaftar = pengaturan(situs, "url_daftar", "/register");

  return (
    <div className={`lp ${jakarta.className}`}>
      {/* Tulisan tangan dipakai di enam tempat yang tersebar di beberapa
          komponen, jadi lebih ringkas mengikatnya sekali di sini daripada
          menurunkan nama fontnya sebagai prop ke masing-masing. */}
      <style>{`.lp .tangan{font-family:${caveat.style.fontFamily}}`}</style>

      <KepalaHalaman
        namaMerek={namaMerek}
        aksenMerek={aksenMerek}
        tagline={situs?.body ?? ""}
        logoUrl={LOGO}
        menu={menu}
        labelMasuk={labelMasuk}
        urlMasuk={urlMasuk}
        labelDaftar={labelDaftar}
        urlDaftar={urlDaftar}
      />

      <Pembuka bagian={byKey.hero} />
      <Realita bagian={byKey.realita} />
      <KartuMasalah bagian={byKey.masalah} />
      <Pergeseran bagian={byKey.pergeseran} />
      <Solusi bagian={byKey.solusi} logoUrl={LOGO} />
      <BagianKalkulator bagian={byKey.kalkulator} />
      <Langkah bagian={byKey.langkah} />
      <Profil bagian={byKey.profil} />
      <MasaDepan bagian={byKey["masa-depan"]} />
      <TanyaJawab bagian={byKey.faq} />

      <KakiHalaman
        bagian={byKey.kaki}
        situs={situs}
        menu={menu}
        namaMerek={namaMerek}
        aksenMerek={aksenMerek}
        logoUrl={LOGO}
        labelDaftar={labelDaftar}
        urlDaftar={urlDaftar}
        labelMasuk={labelMasuk}
        urlMasuk={urlMasuk}
      />

      <TombolWhatsapp
        nomor={pengaturan(situs, "wa_nomor", "")}
        label={pengaturan(situs, "wa_label", "Hub Kami")}
        pesan={pengaturan(situs, "wa_pesan", "")}
      />
    </div>
  );
}

/**
 * Gambar sebuah bagian, atau tempat kosong beserta keterangan kalau fotonya
 * belum diisi.
 *
 * Tempat kosongnya sengaja dibiarkan terbuka dan diberi keterangan, bukan
 * ditutup foto stok: foto gedung perkantoran yang jelas bukan desa Indonesia
 * justru menurunkan kepercayaan yang sedang dibangun halaman ini. Pada saat
 * yang sama, keterangannya menjadi daftar foto yang perlu disiapkan.
 */
function Gambar({
  media,
  catatan,
  gelap = false,
  prioritas = false,
  sizes = "(max-width: 1024px) 100vw, 560px",
}: {
  media: LandingMedia | null | undefined;
  catatan: string;
  gelap?: boolean;
  prioritas?: boolean;
  /**
   * Seberapa lebar gambar ini benar-benar tampil. Next.js memakainya untuk
   * memilih ukuran berkas yang dikirim, jadi nilai yang terlalu besar
   * berarti HP dengan sinyal desa mengunduh piksel yang tidak pernah
   * terlihat — kartu masalah hanya selebar sekitar 270 piksel.
   */
  sizes?: string;
}) {
  const url = urlGambar(media);

  if (!url || !media) {
    return (
      <div className={`gambar-bingkai ${gelap ? "gelap" : ""}`}>
        <div className="foto-kosong">
          <span>{catatan}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`gambar-bingkai ${gelap ? "gelap" : ""}`}>
      <Image
        src={url}
        alt={media.alt_text}
        width={media.width ?? 1600}
        height={media.height ?? 1000}
        priority={prioritas}
        sizes={sizes}
      />
    </div>
  );
}

function Centang() {
  return (
    <span className="centang">
      <svg
        viewBox="0 0 24 24"
        width={12}
        height={12}
        fill="none"
        stroke="currentColor"
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 12.5l5.5 5.5L20 7" />
      </svg>
    </span>
  );
}

// ── Pembuka ────────────────────────────────────────────────────────────────
function Pembuka({ bagian }: { bagian: LandingSectionFull | undefined }) {
  if (!bagian?.is_visible) return null;

  const kartuJudul = pengaturan(bagian, "kartu_judul", "");
  const pita = pengaturan(bagian, "pita_tangan", "");

  return (
    <section className="pembuka" id="beranda">
      <div className="bungkus pembuka-isi">
        <div>
          {bagian.eyebrow ? <p className="eyebrow">{bagian.eyebrow}</p> : null}

          <h1>
            {bagian.title}
            {bagian.title_accent ? <span className="merah">{bagian.title_accent}</span> : null}
          </h1>

          {bagian.body ? <p className="sub">{bagian.body}</p> : null}

          <div className="pembuka-tombol">
            <a
              className="tombol tombol-utama"
              href={pengaturan(bagian, "tombol_utama_url", "/register")}
            >
              {pengaturan(bagian, "tombol_utama", "Daftar Jadi Mitra")}
              <ArrowRight size={17} strokeWidth={2.2} />
            </a>
            {pengaturan(bagian, "tombol_kedua", "") ? (
              <a className="tombol tombol-putih" href={pengaturan(bagian, "tombol_kedua_url", "#")}>
                {pengaturan(bagian, "tombol_kedua", "")}
              </a>
            ) : null}
          </div>

          {bagian.items.length > 0 ? (
            <ul className="centang-baris">
              {butirKelompok(bagian).map((butir) => (
                <li key={butir.id}>
                  <Centang />
                  {butir.title}
                </li>
              ))}
            </ul>
          ) : null}

          {bagian.script_text ? <p className="tangan">{bagian.script_text}</p> : null}
        </div>

        <div className="pembuka-gambar">
          {pita ? <p className="pita-tangan tangan">{`“${pita}”`}</p> : null}

          <Gambar
            media={bagian.media}
            prioritas
            catatan="Foto utama: kepala desa berjabat tangan dengan warga di depan papan BUMDes, Merah Putih terlihat."
          />

          {kartuJudul ? (
            <div className="kartu-melayang">
              <span className="bulat">
                <Ikon nama="handshake" size={18} />
              </span>
              <span>
                <b>{kartuJudul}</b>
                <em />
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

// ── Realita di lapangan ────────────────────────────────────────────────────
function Realita({ bagian }: { bagian: LandingSectionFull | undefined }) {
  if (!bagian?.is_visible) return null;

  return (
    <section className="gelap realita" id="tentang">
      <div className="bungkus realita-isi">
        <div>
          {bagian.eyebrow ? <p className="eyebrow terang">{bagian.eyebrow}</p> : null}

          <h2>
            {bagian.title}
            {bagian.title_accent ? <span className="merah">{bagian.title_accent}</span> : null}
          </h2>

          {bagian.body ? <p className="sub">{bagian.body}</p> : null}
          {bagian.body_secondary ? <p className="sub-kecil">{bagian.body_secondary}</p> : null}
          {bagian.quote ? <blockquote className="kutipan">{bagian.quote}</blockquote> : null}
        </div>

        <div className="gelembung-area">
          <Gambar
            media={bagian.media}
            gelap
            catatan="Foto pendukung: pengurus BUMDes termenung di meja kerja, tumpukan map Program, Anggaran, Rencana Usaha, Laporan."
          />

          {bagian.items.length > 0 ? (
            <div className="gelembung-daftar">
              {butirKelompok(bagian).map((butir) => (
                <div className="gelembung" key={butir.id}>
                  <i>
                    <Ikon nama={butir.icon} size={14} />
                  </i>
                  {butir.title}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

// ── Kartu masalah ──────────────────────────────────────────────────────────
function KartuMasalah({ bagian }: { bagian: LandingSectionFull | undefined }) {
  if (!bagian?.is_visible) return null;
  const kartu = butirKelompok(bagian);
  if (kartu.length === 0) return null;

  return (
    <section className="masalah">
      <div className="bungkus">
        {bagian.eyebrow ? <p className="eyebrow">{bagian.eyebrow}</p> : null}

        <div className="kartu-grid">
          {kartu.map((butir) => (
            <article className="kartu" key={butir.id}>
              <Gambar
                media={butir.media}
                catatan="Foto pendukung kartu ini."
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
              />
              <div className="kartu-teks">
                <h3>{butir.title}</h3>
                <p>{butir.body}</p>
                <span className="garis" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pergeseran cara pandang ────────────────────────────────────────────────
function Pergeseran({ bagian }: { bagian: LandingSectionFull | undefined }) {
  if (!bagian?.is_visible) return null;

  return (
    <section className="gelap pergeseran">
      <div className="bungkus pergeseran-isi">
        <div className="kepala-kecil">
          <span className="otak">
            <Brain size={22} strokeWidth={1.7} />
          </span>
          <div>
            {bagian.body ? <p className="satu">{bagian.body}</p> : null}
            <p className="dua">
              {bagian.body_secondary}{" "}
              <span className="emas">{pengaturan(bagian, "sorotan", "")}</span>
            </p>

            {bagian.items.length > 0 ? (
              <div className="lencana">
                {butirKelompok(bagian).map((butir) => (
                  <span key={butir.id}>{butir.title}</span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {bagian.script_text ? <p className="tangan">{`“${bagian.script_text}”`}</p> : null}
      </div>
    </section>
  );
}

// ── Solusi ─────────────────────────────────────────────────────────────────
function Solusi({ bagian, logoUrl }: { bagian: LandingSectionFull | undefined; logoUrl: string }) {
  if (!bagian?.is_visible) return null;

  const centang = butirKelompok(bagian, "centang");
  const manfaat = butirKelompok(bagian, "manfaat");

  return (
    <section className="solusi" id="manfaat">
      <div className="bungkus">
        {bagian.eyebrow ? <p className="eyebrow">{bagian.eyebrow}</p> : null}

        <h2>
          {bagian.title} <span className="merah">{bagian.title_accent}</span>
        </h2>

        <div className="solusi-isi">
          <div className="solusi-kiri">
            {bagian.body ? <p className="sub">{bagian.body}</p> : null}

            {centang.length > 0 ? (
              <ul className="centang-daftar">
                {centang.map((butir) => (
                  <li key={butir.id}>
                    <Centang />
                    {butir.title}
                  </li>
                ))}
              </ul>
            ) : null}

            {bagian.script_text ? <p className="tangan">{bagian.script_text}</p> : null}
          </div>

          <div className="solusi-kanan">
            <div>
              <LayarAplikasi
                logoUrl={logoUrl}
                saldo={pengaturan(bagian, "saldo_contoh", "Rp 1.250.000")}
              />
              <p className="hp-catatan">
                {pengaturan(bagian, "catatan_hp", "Contoh tampilan — angka bukan data nyata")}
              </p>
            </div>

            {manfaat.length > 0 ? (
              <div className="dapat">
                <h3>{pengaturan(bagian, "judul_manfaat", "Apa yang Anda Dapatkan?")}</h3>
                <div className="dapat-grid">
                  {manfaat.map((butir) => (
                    <div className="dapat-kartu" key={butir.id}>
                      <i>
                        <Ikon nama={butir.icon} size={18} />
                      </i>
                      <h4>{butir.title}</h4>
                      <p>{butir.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Gambaran layar Beranda aplikasi, digambar dengan CSS.
 *
 * Bukan tangkapan layar sungguhan, dan itu disengaja: tangkapan layar berisi
 * saldo dan nomor pelanggan mitra yang nyata, dan gambar seperti itu tidak
 * boleh terpasang di halaman yang dibaca publik.
 */
function LayarAplikasi({ logoUrl, saldo }: { logoUrl: string; saldo: string }) {
  const menu = [
    { ikon: <Smartphone size={15} strokeWidth={1.9} />, nama: "Pulsa" },
    { ikon: <Zap size={15} strokeWidth={1.9} />, nama: "Token" },
    { ikon: <Receipt size={15} strokeWidth={1.9} />, nama: "Tagihan" },
    { ikon: <Wallet size={15} strokeWidth={1.9} />, nama: "E-Wallet" },
    { ikon: <Store size={15} strokeWidth={1.9} />, nama: "Toko" },
    { ikon: <BarChart3 size={15} strokeWidth={1.9} />, nama: "Laporan" },
  ];

  return (
    <div className="hp">
      <div className="hp-atas">
        <div className="merek-mini">
          <span className="lambang">
            <Image src={logoUrl} alt="" width={29} height={29} />
          </span>
          DIGIDES PAY
        </div>
        <p className="hp-saldo-label">Saldo Utama</p>
        <p className="hp-saldo">{saldo}</p>
      </div>

      <div className="hp-menu">
        {menu.map((butir) => (
          <div key={butir.nama}>
            <i>{butir.ikon}</i>
            <span>{butir.nama}</span>
          </div>
        ))}
      </div>

      <div className="hp-bawah">
        <p className="judul">TRANSAKSI TERAKHIR</p>
        <div className="hp-baris">
          <span>Token Listrik 50.000</span>
          <span>&minus;Rp 51.500</span>
        </div>
        <div className="hp-baris">
          <span>Pulsa Telkomsel 25.000</span>
          <span>&minus;Rp 25.800</span>
        </div>
        <div className="hp-baris">
          <span>BPJS Kesehatan</span>
          <span>&minus;Rp 105.000</span>
        </div>
      </div>
    </div>
  );
}

// ── Kalkulator ─────────────────────────────────────────────────────────────
function BagianKalkulator({ bagian }: { bagian: LandingSectionFull | undefined }) {
  if (!bagian?.is_visible) return null;

  const layanan: LayananHitung[] = butirKelompok(bagian).map((butir) => ({
    id: butir.id,
    nama: butir.title ?? "",
    keterangan: butir.body ?? "",
    ikon: butir.icon,
    basis: butir.data?.basis === "hp" ? "hp" : "rumah",
    satuan: String(butir.data?.satuan ?? (butir.data?.basis === "hp" ? "orang" : "rumah")),
    warna: butir.data?.warna === "emas" ? "emas" : "merah",
    feeAwal: angkaData(butir, "fee", 500),
    frekuensiAwal: angkaData(butir, "frekuensi", 1),
  }));

  if (layanan.length === 0) return null;

  return (
    <Kalkulator
      eyebrow={bagian.eyebrow ?? ""}
      judul={bagian.title ?? ""}
      judulAksen={bagian.title_accent ?? ""}
      pengantar={bagian.body ?? ""}
      labelPenduduk={pengaturan(bagian, "label_penduduk", "Jumlah penduduk")}
      labelRumah={pengaturan(bagian, "label_rumah", "Jumlah rumah")}
      labelHp={pengaturan(bagian, "label_hp", "Pengguna HP Android")}
      labelPersen={pengaturan(bagian, "label_persen", "Berapa persen yang bisa Anda edukasi?")}
      pendudukAwal={pengaturan(bagian, "penduduk", 1200)}
      rumahAwal={pengaturan(bagian, "rumah", 300)}
      hpAwal={pengaturan(bagian, "hp", 300)}
      persenAwal={pengaturan(bagian, "persen", 30)}
      catatan={pengaturan(bagian, "catatan", "")}
      labelTombol={pengaturan(bagian, "tombol", "")}
      urlTombol={pengaturan(bagian, "tombol_url", "/register")}
      layanan={layanan}
    />
  );
}

// ── Langkah ────────────────────────────────────────────────────────────────
function Langkah({ bagian }: { bagian: LandingSectionFull | undefined }) {
  if (!bagian?.is_visible) return null;
  const langkah = butirKelompok(bagian);

  return (
    <section className="langkah" id="cara-kerja">
      <div className="bungkus">
        <h2>{bagian.title}</h2>
        {bagian.body ? <p className="sub">{bagian.body}</p> : null}

        <div className="langkah-isi">
          {/* Bernomor karena memang berurutan: isi saldo tidak bisa
              mendahului pendaftaran, dan melayani warga tidak bisa
              mendahului saldo. */}
          <ol className="langkah-grid">
            {langkah.map((butir, urut) => (
              <li key={butir.id}>
                <div className="langkah-nomor">{urut + 1}</div>
                <h3>{butir.title}</h3>
                <p>{butir.body}</p>
              </li>
            ))}
          </ol>

          {bagian.script_text ? <p className="tangan">{`“${bagian.script_text}”`}</p> : null}
        </div>
      </div>
    </section>
  );
}

// ── Profil ─────────────────────────────────────────────────────────────────
/**
 * Kartu profil tidak tahu apa-apa tentang jabatan yang dipajangnya.
 *
 * Itu yang membuat menambah profil konsultan IT, komisaris, atau siapa pun
 * nanti tidak menyentuh kode sama sekali: ia baris baru di basis data, dan
 * digambar kartu yang sama persis seperti profil direktur.
 */
function Profil({ bagian }: { bagian: LandingSectionFull | undefined }) {
  if (!bagian?.is_visible) return null;
  const orang = butirKelompok(bagian);
  if (orang.length === 0) return null;

  return (
    <section className="profil" id="profil">
      <div className="bungkus">
        {bagian.eyebrow ? <p className="eyebrow">{bagian.eyebrow}</p> : null}
        <h2>
          {bagian.title} <span className="merah">{bagian.title_accent}</span>
        </h2>
        {bagian.body ? <p className="sub">{bagian.body}</p> : null}

        <div className="profil-grid">
          {orang.map((butir) => (
            <article className="profil-kartu" key={butir.id}>
              <div className="profil-foto">
                {butir.media ? (
                  <Image
                    src={urlGambar(butir.media) as string}
                    alt={butir.media.alt_text || (butir.title ?? "")}
                    width={butir.media.width ?? 800}
                    height={butir.media.height ?? 1000}
                    sizes="(max-width: 640px) 100vw, 280px"
                  />
                ) : (
                  // Fotonya belum ada. Huruf awal namanya jauh lebih baik
                  // daripada siluet orang abu-abu yang sama untuk semua.
                  <span className="inisial">{(butir.title ?? "?").trim().charAt(0)}</span>
                )}
              </div>

              <div className="profil-teks">
                <b>{butir.title}</b>
                {butir.subtitle ? <span className="profil-jabatan">{butir.subtitle}</span> : null}
                {butir.body ? <p>{butir.body}</p> : null}
                {butir.link_url && butir.link_label ? (
                  <a className="profil-tautan" href={butir.link_url}>
                    {butir.link_label}
                    <ArrowRight size={14} strokeWidth={2.4} />
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Masa depan desa ────────────────────────────────────────────────────────
function MasaDepan({ bagian }: { bagian: LandingSectionFull | undefined }) {
  if (!bagian?.is_visible) return null;
  const manfaat = butirKelompok(bagian);

  return (
    <section className="masa-depan">
      <div className="bungkus">
        <div className="masa-depan-atas">
          <div>
            <h2>{bagian.title}</h2>
            {bagian.body ? <p className="sub">{bagian.body}</p> : null}
          </div>

          {bagian.script_text ? <p className="tangan">{`“${bagian.script_text}”`}</p> : null}
        </div>

        {manfaat.length > 0 ? (
          <ul className="manfaat-grid">
            {manfaat.map((butir) => (
              <li key={butir.id}>
                <i>
                  <Ikon nama={butir.icon} size={24} />
                </i>
                <b>{butir.title}</b>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

// ── Tanya jawab ────────────────────────────────────────────────────────────
function TanyaJawab({ bagian }: { bagian: LandingSectionFull | undefined }) {
  if (!bagian?.is_visible) return null;
  const tanya = butirKelompok(bagian);
  if (tanya.length === 0) return null;

  return (
    <section className="tanya" id="faq">
      <div className="bungkus tanya-isi">
        <h2>{bagian.title}</h2>
        {bagian.body ? <p className="sub">{bagian.body}</p> : null}

        {/* <details> asli, bukan akordeon buatan sendiri: tetap bisa dibuka
            tanpa JavaScript, dan isinya terbaca oleh mesin pencari. */}
        <div className="tanya-daftar">
          {tanya.map((butir, urut) => (
            <details key={butir.id} open={urut === 0}>
              <summary>
                {butir.title}
                <span className="tanda" aria-hidden>
                  +
                </span>
              </summary>
              <p>{butir.body}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Kaki halaman ───────────────────────────────────────────────────────────
function KakiHalaman({
  bagian,
  situs,
  menu,
  namaMerek,
  aksenMerek,
  logoUrl,
  labelDaftar,
  urlDaftar,
  labelMasuk,
  urlMasuk,
}: {
  bagian: LandingSectionFull | undefined;
  situs: LandingSectionFull | undefined;
  menu: { id: string; label: string; url: string }[];
  namaMerek: string;
  aksenMerek: string;
  logoUrl: string;
  labelDaftar: string;
  urlDaftar: string;
  labelMasuk: string;
  urlMasuk: string;
}) {
  const tahun = new Date().getFullYear();

  return (
    <footer className="kaki">
      <div className="bungkus">
        {bagian?.is_visible ? (
          <div className="kaki-ajakan">
            <h2>{bagian.title}</h2>
            {bagian.body ? <p>{bagian.body}</p> : null}
            <div className="kaki-tombol">
              <a className="tombol tombol-utama" href={urlDaftar}>
                {labelDaftar}
                <ArrowRight size={17} strokeWidth={2.2} />
              </a>
              <a className="tombol tombol-putih" href={urlMasuk}>
                {labelMasuk}
              </a>
            </div>
          </div>
        ) : null}

        <div className="kaki-bawah">
          <a className="merek" href="#beranda">
            <span className="lambang">
              <Image src={logoUrl} alt="" width={60} height={60} />
            </span>
            <span>
              <span className="merek-nama" style={{ color: "#fff" }}>
                {namaMerek} <span>{aksenMerek}</span>
              </span>
              <span className="merek-tag">{situs?.body}</span>
            </span>
          </a>

          <nav className="nav" aria-label="Menu kaki halaman">
            {menu.map((tautan) => (
              <a key={tautan.id} href={tautan.url}>
                {tautan.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="kaki-catatan">
          <span>{pengaturan(bagian, "catatan_legal", "")}</span>
          {situs?.script_text ? <span className="tangan">{situs.script_text}</span> : null}
        </div>

        <p className="kaki-catatan" style={{ marginTop: 10 }}>
          © {tahun} {pengaturan(situs, "hak_cipta", "DIGIDES PAY. Semua hak dilindungi.")}
        </p>
      </div>
    </footer>
  );
}
