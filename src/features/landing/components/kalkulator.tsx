"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Ikon } from "./ikon";

/**
 * Satu baris layanan di kalkulator.
 *
 * `basis` menentukan angka desa mana yang dipakai sebagai dasar: 'rumah'
 * untuk layanan yang melekat pada rumah (token listrik — tiap rumah punya
 * meteran), 'hp' untuk yang melekat pada orang (pulsa, paket data). Keduanya
 * berjalan sendiri-sendiri dan hasilnya dijumlahkan.
 */
export interface LayananHitung {
  id: string;
  nama: string;
  keterangan: string;
  ikon: string | null;
  basis: "rumah" | "hp";
  satuan: string;
  warna: "emas" | "merah";
  feeAwal: number;
  frekuensiAwal: number;
}

export interface KalkulatorProps {
  eyebrow: string;
  judul: string;
  judulAksen: string;
  pengantar: string;
  labelPenduduk: string;
  labelRumah: string;
  labelHp: string;
  labelPersen: string;
  pendudukAwal: number;
  rumahAwal: number;
  hpAwal: number;
  persenAwal: number;
  catatan: string;
  labelTombol: string;
  urlTombol: string;
  layanan: LayananHitung[];
}

const format = new Intl.NumberFormat("id-ID");
const rupiah = (n: number) => "Rp " + format.format(Math.round(n));

/**
 * Kolom yang dikosongkan tidak boleh membuat hasilnya menjadi "NaN" — layar
 * yang menampilkan "Rp NaN" saat seseorang menghapus satu angka untuk
 * mengetik ulang terasa rusak, padahal ia sedang mengetik.
 */
function baca(teks: string, bawaan: number): number {
  const nilai = Number.parseInt(teks, 10);
  return Number.isFinite(nilai) && nilai >= 0 ? nilai : bawaan;
}

export function Kalkulator(props: KalkulatorProps) {
  const [penduduk, setPenduduk] = useState(String(props.pendudukAwal));
  const [rumah, setRumah] = useState(String(props.rumahAwal));
  const [hp, setHp] = useState(String(props.hpAwal));
  const [persen, setPersen] = useState(props.persenAwal);

  const [fee, setFee] = useState<Record<string, string>>(() =>
    Object.fromEntries(props.layanan.map((l) => [l.id, String(l.feeAwal)])),
  );
  const [frekuensi, setFrekuensi] = useState<Record<string, string>>(() =>
    Object.fromEntries(props.layanan.map((l) => [l.id, String(l.frekuensiAwal)])),
  );

  const hitung = useMemo(() => {
    const nPenduduk = baca(penduduk, 0);
    const nRumah = baca(rumah, 0);
    const nHp = baca(hp, 0);

    const rumahAktif = Math.round((nRumah * persen) / 100);
    const penggunaAktif = Math.round((nHp * persen) / 100);

    const baris = props.layanan.map((layanan) => {
      const dasar = layanan.basis === "rumah" ? rumahAktif : penggunaAktif;
      const nFee = baca(fee[layanan.id] ?? "", 0);
      const nFrek = baca(frekuensi[layanan.id] ?? "", 0);
      const transaksi = dasar * nFrek;
      return { layanan, dasar, fee: nFee, frekuensi: nFrek, transaksi, nilai: transaksi * nFee };
    });

    const total = baris.reduce((jumlah, b) => jumlah + b.nilai, 0);
    const transaksi = baris.reduce((jumlah, b) => jumlah + b.transaksi, 0);

    // Rata-rata jiwa per rumah menerjemahkan "rumah aktif" menjadi jumlah
    // orang — angka yang jauh lebih mudah dibayangkan saat dibawa ke
    // musyawarah desa daripada jumlah kepala keluarga.
    const perRumah = nRumah > 0 ? nPenduduk / nRumah : 0;
    const jiwa = perRumah > 0 ? Math.round(rumahAktif * perRumah) : null;

    // Pemeriksaan kewajaran. Kalkulator yang diam saja saat diisi angka
    // mustahil akan menghasilkan proposal yang dibantah orang pertama yang
    // membacanya — lebih baik ia yang menegur, di sini, sekarang.
    let petunjuk = "";
    if (nRumah > 0 && nPenduduk > 0 && nRumah > nPenduduk) {
      petunjuk = "Jumlah rumah lebih banyak daripada jumlah penduduk. Coba periksa lagi angkanya.";
    } else if (nHp > 0 && nPenduduk > 0 && nHp > nPenduduk) {
      petunjuk =
        "Pengguna HP lebih banyak daripada jumlah penduduk. Mungkin yang dihitung jumlah perangkat, bukan orang.";
    } else if (perRumah > 10) {
      petunjuk = `Rata-rata ${Math.round(perRumah)} jiwa per rumah terasa terlalu tinggi. Coba periksa lagi angkanya.`;
    }

    return { baris, total, transaksi, jiwa, petunjuk };
  }, [penduduk, rumah, hp, persen, fee, frekuensi, props.layanan]);

  // Batangnya dibandingkan terhadap yang terbesar, bukan terhadap total.
  // Membandingkan ke total membuat dua sumber yang seimbang tampil sebagai
  // dua batang setengah penuh, dan yang terbaca justru "kedua-duanya kecil"
  // — padahal yang ingin ditunjukkan adalah perbandingan di antara keduanya.
  const terbesar = Math.max(...hitung.baris.map((b) => b.nilai), 1);

  return (
    <section className="gelap hitung" id="hitung">
      <div className="bungkus">
        <div className="hitung-kepala">
          {props.eyebrow ? <p className="eyebrow terang">{props.eyebrow}</p> : null}
          <h2>
            {props.judul}
            {props.judulAksen ? <span className="merah">{props.judulAksen}</span> : null}
          </h2>
          {props.pengantar ? <p className="sub">{props.pengantar}</p> : null}
        </div>

        <div className="papan">
          <div className="papan-kiri">
            <p className="sub-judul">Angka desa Anda</p>

            <div className="isian-grid">
              <div className="isian">
                <label htmlFor="lp-penduduk">{props.labelPenduduk}</label>
                <div className="kotak">
                  <input
                    id="lp-penduduk"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={penduduk}
                    onChange={(e) => setPenduduk(e.target.value)}
                  />
                  <span className="satuan">jiwa</span>
                </div>
              </div>

              <div className="isian">
                <label htmlFor="lp-rumah">{props.labelRumah}</label>
                <div className="kotak">
                  <input
                    id="lp-rumah"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={rumah}
                    onChange={(e) => setRumah(e.target.value)}
                  />
                  <span className="satuan">rumah</span>
                </div>
              </div>

              <div className="isian">
                <label htmlFor="lp-hp">{props.labelHp}</label>
                <div className="kotak">
                  <input
                    id="lp-hp"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={hp}
                    onChange={(e) => setHp(e.target.value)}
                  />
                  <span className="satuan">orang</span>
                </div>
              </div>

              <div className="isian lebar">
                <div className="geser-atas">
                  <label htmlFor="lp-persen">{props.labelPersen}</label>
                  <b>{persen}%</b>
                </div>
                <input
                  id="lp-persen"
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={persen}
                  onChange={(e) => setPersen(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="petunjuk" hidden={hitung.petunjuk === ""}>
              <Info size={15} />
              <span>{hitung.petunjuk}</span>
            </div>

            <hr className="pemisah" />

            <p className="sub-judul">
              Pendapatan dari tiap layanan{" "}
              <span>&mdash; berjalan sendiri-sendiri, lalu dijumlahkan</span>
            </p>

            {hitung.baris.map((baris) => (
              <div className="layanan" key={baris.layanan.id}>
                <div className="layanan-kepala">
                  <span className={`layanan-ikon ${baris.layanan.warna}`}>
                    <Ikon nama={baris.layanan.ikon} size={19} />
                  </span>
                  <span className="layanan-nama">
                    <b>{baris.layanan.nama}</b>
                    <span>{baris.layanan.keterangan}</span>
                  </span>
                  <em className="layanan-sub">{rupiah(baris.nilai)}</em>
                </div>

                <div className="layanan-isian">
                  <div className="mini">
                    <span className="tajuk">
                      {baris.layanan.basis === "rumah" ? "Rumah aktif" : "Pengguna aktif"}
                    </span>
                    <span className="dasar">
                      {format.format(baris.dasar)} {baris.layanan.satuan}
                    </span>
                  </div>
                  <div className="mini">
                    <label className="tajuk" htmlFor={`fee-${baris.layanan.id}`}>
                      Fee Anda
                    </label>
                    <div className="kotak kecil">
                      <span className="awalan">Rp</span>
                      <input
                        id={`fee-${baris.layanan.id}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={fee[baris.layanan.id] ?? ""}
                        onChange={(e) =>
                          setFee((lama) => ({ ...lama, [baris.layanan.id]: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="mini">
                    <label className="tajuk" htmlFor={`frek-${baris.layanan.id}`}>
                      Beli / bulan
                    </label>
                    <div className="kotak kecil">
                      <input
                        id={`frek-${baris.layanan.id}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={frekuensi[baris.layanan.id] ?? ""}
                        onChange={(e) =>
                          setFrekuensi((lama) => ({ ...lama, [baris.layanan.id]: e.target.value }))
                        }
                      />
                      <span className="satuan">kali</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="papan-kanan">
            <p className="hasil-label">Perkiraan pendapatan BUMDes</p>
            <p className="hasil-angka">{rupiah(hitung.total)}</p>
            <p className="hasil-per">
              per bulan, dari {hitung.baris.length === 1 ? "layanan ini" : "semua layanan digabung"}
            </p>

            <div className="hasil-tahun">
              <span>Dalam setahun</span>
              <b>{rupiah(hitung.total * 12)}</b>
            </div>

            <div className="rincian">
              <p className="rincian-judul">Dari mana angkanya</p>

              {hitung.baris.map((baris) => (
                <div className="rincian-baris" key={baris.layanan.id}>
                  <div className="rincian-atas">
                    <b>{baris.layanan.nama}</b>
                    <em>{rupiah(baris.nilai)}</em>
                  </div>
                  <p className="rincian-rumus">
                    {format.format(baris.dasar)} {baris.layanan.satuan} &times; {rupiah(baris.fee)}{" "}
                    &times; {format.format(baris.frekuensi)} kali
                  </p>
                  <div className="rincian-bar">
                    <i
                      className={baris.layanan.warna}
                      style={{ width: `${(baris.nilai / terbesar) * 100}%` }}
                    />
                  </div>
                </div>
              ))}

              <div className="jumlah-baris">
                <b>TOTAL SEBULAN</b>
                <em>{rupiah(hitung.total)}</em>
              </div>

              <div className="rincian-baris rincian-kecil">
                <div className="rincian-atas">
                  <b>Transaksi tiap bulan</b>
                  <em>{format.format(hitung.transaksi)} transaksi</em>
                </div>
              </div>

              <div className="rincian-baris rincian-kecil">
                <div className="rincian-atas">
                  <b>Warga dalam rumah terlayani</b>
                  <em>{hitung.jiwa === null ? "—" : `± ${format.format(hitung.jiwa)} jiwa`}</em>
                </div>
              </div>
            </div>

            {props.catatan ? (
              <p className="jujur">
                <b>Ini perkiraan, bukan janji.</b> {props.catatan}
              </p>
            ) : null}

            {props.labelTombol ? (
              <a className="tombol tombol-utama" href={props.urlTombol}>
                {props.labelTombol}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
