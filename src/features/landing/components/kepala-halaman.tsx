"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";

export interface TautanMenu {
  id: string;
  label: string;
  url: string;
}

/**
 * Kepala halaman beserta laci menu untuk layar sempit.
 *
 * Menu isinya diatur admin dan bisa bertambah kapan saja, jadi laci ini
 * tidak boleh punya tinggi yang ditebak di kode. Ia hanya muncul dan hilang.
 *
 * Laci ditutup sendiri setiap kali sebuah tautan ditekan: semua tautannya
 * menuju bagian di halaman yang sama, jadi tanpa itu pembaca akan sampai di
 * bagian tujuan sambil tetap tertutup laci yang menghalangi pandangannya.
 */
export function KepalaHalaman({
  namaMerek,
  aksenMerek,
  tagline,
  logoUrl,
  menu,
  labelMasuk,
  urlMasuk,
  labelDaftar,
  urlDaftar,
}: {
  namaMerek: string;
  aksenMerek: string;
  tagline: string;
  logoUrl: string;
  menu: TautanMenu[];
  labelMasuk: string;
  urlMasuk: string;
  labelDaftar: string;
  urlDaftar: string;
}) {
  const [terbuka, setTerbuka] = useState(false);

  // Laci hanya ada di layar sempit. Kalau jendela dilebarkan sementara laci
  // terbuka, keadaan "terbuka" akan tertinggal dan tombol hamburger-nya
  // sudah tidak terlihat lagi untuk menutupnya.
  useEffect(() => {
    if (!terbuka) return;
    const media = window.matchMedia("(min-width: 1025px)");
    const tutup = () => setTerbuka(false);
    media.addEventListener("change", tutup);
    return () => media.removeEventListener("change", tutup);
  }, [terbuka]);

  // Tombol Esc menutup laci — kebiasaan yang sudah dimiliki orang, dan
  // gratis untuk dihormati.
  useEffect(() => {
    if (!terbuka) return;
    const tekan = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTerbuka(false);
    };
    window.addEventListener("keydown", tekan);
    return () => window.removeEventListener("keydown", tekan);
  }, [terbuka]);

  return (
    <header className="kepala">
      <div className="bungkus kepala-isi">
        <a className="merek" href="#beranda">
          <span className="lambang">
            <Image src={logoUrl} alt="" width={60} height={60} priority />
          </span>
          <span>
            <span className="merek-nama">
              {namaMerek} <span>{aksenMerek}</span>
            </span>
            <span className="merek-tag">{tagline}</span>
          </span>
        </a>

        <nav className="nav" aria-label="Menu utama">
          {menu.map((tautan, urut) => (
            <a key={tautan.id} href={tautan.url} aria-current={urut === 0 ? "page" : undefined}>
              {tautan.label}
            </a>
          ))}
        </nav>

        <div className="kepala-aksi">
          <a className="tombol tombol-putih" href={urlMasuk}>
            {labelMasuk}
          </a>
          <a className="tombol tombol-utama" href={urlDaftar}>
            {labelDaftar}
          </a>
        </div>

        <button
          type="button"
          className="hamburger"
          aria-expanded={terbuka}
          aria-controls="laci-menu"
          aria-label={terbuka ? "Tutup menu" : "Buka menu"}
          onClick={() => setTerbuka((nilai) => !nilai)}
        >
          {terbuka ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {terbuka ? (
        <div className="laci" id="laci-menu">
          <div className="bungkus laci-isi">
            {menu.map((tautan) => (
              <a key={tautan.id} href={tautan.url} onClick={() => setTerbuka(false)}>
                {tautan.label}
              </a>
            ))}
            <a className="tombol tombol-utama" href={urlDaftar}>
              {labelDaftar}
            </a>
            <a className="tombol tombol-putih" href={urlMasuk}>
              {labelMasuk}
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
