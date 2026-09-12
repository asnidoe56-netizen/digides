"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DAFTAR_IKON } from "@/features/landing/components/ikon";
import {
  JUDUL_BAGIAN,
  KELOMPOK_BUTIR,
  LADANG_BAGIAN,
  type Ladang,
} from "@/features/landing-admin/config";
import type { LandingItemFull, LandingMedia, LandingSectionFull } from "@/types/landing";
import { PemilihGambar } from "./pemilih-gambar";

/** Membaca nilai sebuah ladang, termasuk yang bersarang di settings/data. */
function bacaLadang(sumber: Record<string, unknown>, nama: string): string {
  if (nama.includes(".")) {
    const [induk, anak] = nama.split(".");
    const wadah = sumber[induk] as Record<string, unknown> | undefined;
    const nilai = wadah?.[anak];
    return nilai === undefined || nilai === null ? "" : String(nilai);
  }
  const nilai = sumber[nama];
  return nilai === undefined || nilai === null ? "" : String(nilai);
}

/**
 * Menyusun badan permintaan dari nilai formulir.
 *
 * Ladang bersarang (`settings.x`, `data.x`) dikumpulkan dulu menjadi satu
 * objek utuh, karena server menyimpan jsonb secara utuh — mengirim hanya
 * satu kunci akan menghapus kunci lainnya.
 */
function susunBadan(
  ladang: Ladang[],
  nilai: Record<string, string>,
  aslinya: Record<string, unknown>,
): Record<string, unknown> {
  const badan: Record<string, unknown> = {};
  const bersarang: Record<string, Record<string, unknown>> = {};

  for (const item of ladang) {
    const isi = nilai[item.nama] ?? "";

    if (item.nama.includes(".")) {
      const [induk, anak] = item.nama.split(".");
      if (!bersarang[induk]) {
        bersarang[induk] = { ...((aslinya[induk] as Record<string, unknown>) ?? {}) };
      }
      bersarang[induk][anak] = item.jenis === "angka" ? Number(isi) || 0 : isi;
      continue;
    }

    badan[item.nama] = item.jenis === "angka" ? Number(isi) || 0 : isi === "" ? null : isi;
  }

  return { ...badan, ...bersarang };
}

export function PengelolaHalamanDepan({
  bagianAwal,
  pustakaAwal,
}: {
  bagianAwal: LandingSectionFull[];
  pustakaAwal: LandingMedia[];
}) {
  const router = useRouter();
  const [pustaka, setPustaka] = useState(pustakaAwal);
  const [dibuka, setDibuka] = useState<string | null>(null);

  const muatPustaka = useCallback(async () => {
    const response = await fetch("/api/admin/media");
    if (response.ok) {
      const isi = await response.json();
      setPustaka(isi.media);
    }
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {bagianAwal.map((bagian) => (
        <KartuBagian
          key={bagian.id}
          bagian={bagian}
          pustaka={pustaka}
          terbuka={dibuka === bagian.id}
          onToggle={() => setDibuka(dibuka === bagian.id ? null : bagian.id)}
          onPustakaBerubah={muatPustaka}
          onTersimpan={() => router.refresh()}
        />
      ))}
    </div>
  );
}

function KartuBagian({
  bagian,
  pustaka,
  terbuka,
  onToggle,
  onPustakaBerubah,
  onTersimpan,
}: {
  bagian: LandingSectionFull;
  pustaka: LandingMedia[];
  terbuka: boolean;
  onToggle: () => void;
  onPustakaBerubah: () => void;
  onTersimpan: () => void;
}) {
  const ladang = LADANG_BAGIAN[bagian.kind] ?? [];
  const kelompok = KELOMPOK_BUTIR[bagian.kind] ?? [];

  const [nilai, setNilai] = useState<Record<string, string>>(() =>
    Object.fromEntries(ladang.map((l) => [l.nama, bacaLadang(bagian as unknown as Record<string, unknown>, l.nama)])),
  );
  const [tampil, setTampil] = useState(bagian.is_visible);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  async function simpan() {
    setMenyimpan(true);
    setGalat(null);
    setSukses(false);
    try {
      const badan = susunBadan(ladang, nilai, bagian as unknown as Record<string, unknown>);
      badan.is_visible = tampil;

      const response = await fetch(`/api/admin/landing/sections/${bagian.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(badan),
      });
      if (!response.ok) {
        const isi = await response.json().catch(() => null);
        throw new Error(isi?.error ?? "Gagal menyimpan.");
      }
      setSukses(true);
      onTersimpan();
    } catch (caught) {
      setGalat(caught instanceof Error ? caught.message : "Gagal menyimpan.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <section className="rounded-lg border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {terbuka ? (
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">
            {JUDUL_BAGIAN[bagian.key] ?? bagian.key}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {bagian.title || bagian.eyebrow || bagian.body || "—"}
          </span>
        </span>

        {tampil ? (
          <Eye className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <EyeOff className="size-3" />
            Disembunyikan
          </span>
        )}
      </button>

      {terbuka ? (
        <div className="border-t px-4 py-4">
          {ladang.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {ladang.map((item) => (
                <div
                  key={item.nama}
                  className={item.jenis === "panjang" || item.jenis === "gambar" ? "sm:col-span-2" : ""}
                >
                  <Label htmlFor={`${bagian.id}-${item.nama}`}>{item.label}</Label>

                  {item.jenis === "gambar" ? (
                    <div className="mt-1.5">
                      <PemilihGambar
                        nilai={nilai[item.nama] || null}
                        pustaka={pustaka}
                        petunjuk={item.petunjuk}
                        onPustakaBerubah={onPustakaBerubah}
                        onPilih={(mediaId) =>
                          setNilai((lama) => ({ ...lama, [item.nama]: mediaId ?? "" }))
                        }
                      />
                    </div>
                  ) : item.jenis === "panjang" ? (
                    <textarea
                      id={`${bagian.id}-${item.nama}`}
                      className="mt-1 min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={nilai[item.nama] ?? ""}
                      onChange={(e) => setNilai((lama) => ({ ...lama, [item.nama]: e.target.value }))}
                    />
                  ) : (
                    <Input
                      id={`${bagian.id}-${item.nama}`}
                      className="mt-1"
                      type={item.jenis === "angka" ? "number" : "text"}
                      value={nilai[item.nama] ?? ""}
                      onChange={(e) => setNilai((lama) => ({ ...lama, [item.nama]: e.target.value }))}
                    />
                  )}

                  {item.petunjuk && item.jenis !== "gambar" ? (
                    <p className="mt-1 text-xs text-muted-foreground">{item.petunjuk}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={tampil} onCheckedChange={(v) => setTampil(v === true)} />
              Tampilkan bagian ini di halaman depan
            </label>

            <Button type="button" size="sm" className="ml-auto" disabled={menyimpan} onClick={simpan}>
              {menyimpan ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Simpan
            </Button>
          </div>

          {galat ? (
            <p className="mt-2 flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {galat}
            </p>
          ) : null}
          {sukses ? <p className="mt-2 text-sm text-emerald-600">Tersimpan.</p> : null}

          {kelompok.map((grup) => (
            <DaftarButir
              key={grup.grup}
              sectionId={bagian.id}
              kelompok={grup}
              butir={bagian.items
                .filter((i) => i.group_key === grup.grup)
                .sort((a, b) => a.sort_order - b.sort_order)}
              pustaka={pustaka}
              onPustakaBerubah={onPustakaBerubah}
              onBerubah={onTersimpan}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function DaftarButir({
  sectionId,
  kelompok,
  butir,
  pustaka,
  onPustakaBerubah,
  onBerubah,
}: {
  sectionId: string;
  kelompok: (typeof KELOMPOK_BUTIR)[keyof typeof KELOMPOK_BUTIR][number];
  butir: LandingItemFull[];
  pustaka: LandingMedia[];
  onPustakaBerubah: () => void;
  onBerubah: () => void;
}) {
  const [sibuk, setSibuk] = useState(false);

  async function tambah() {
    setSibuk(true);
    await fetch("/api/admin/landing/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section_id: sectionId, group_key: kelompok.grup, title: "Butir baru" }),
    });
    setSibuk(false);
    onBerubah();
  }

  const penuh = kelompok.maksimal !== undefined && butir.length >= kelompok.maksimal;

  return (
    <div className="mt-6 rounded-lg border bg-muted/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{kelompok.judul}</p>
          {kelompok.keterangan ? (
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{kelompok.keterangan}</p>
          ) : null}
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={sibuk || penuh}
          onClick={tambah}
          title={penuh ? `Rancangannya hanya muat ${kelompok.maksimal} butir.` : undefined}
        >
          {sibuk ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {kelompok.labelTambah}
        </Button>
      </div>

      {butir.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Belum ada isi.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {butir.map((item, urut) => (
            <BarisButir
              key={item.id}
              butir={item}
              ladang={kelompok.ladang}
              pustaka={pustaka}
              pertama={urut === 0}
              terakhir={urut === butir.length - 1}
              onPustakaBerubah={onPustakaBerubah}
              onBerubah={onBerubah}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BarisButir({
  butir,
  ladang,
  pustaka,
  pertama,
  terakhir,
  onPustakaBerubah,
  onBerubah,
}: {
  butir: LandingItemFull;
  ladang: Ladang[];
  pustaka: LandingMedia[];
  pertama: boolean;
  terakhir: boolean;
  onPustakaBerubah: () => void;
  onBerubah: () => void;
}) {
  const [nilai, setNilai] = useState<Record<string, string>>(() =>
    Object.fromEntries(ladang.map((l) => [l.nama, bacaLadang(butir as unknown as Record<string, unknown>, l.nama)])),
  );
  const [tampil, setTampil] = useState(butir.is_visible);
  const [menyimpan, setMenyimpan] = useState(false);
  const [sukses, setSukses] = useState(false);

  async function simpan() {
    setMenyimpan(true);
    setSukses(false);
    const badan = susunBadan(ladang, nilai, butir as unknown as Record<string, unknown>);
    badan.is_visible = tampil;

    await fetch(`/api/admin/landing/items/${butir.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(badan),
    });
    setMenyimpan(false);
    setSukses(true);
    onBerubah();
  }

  async function geser(arah: "naik" | "turun") {
    await fetch(`/api/admin/landing/items/${butir.id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arah }),
    });
    onBerubah();
  }

  async function hapus() {
    const yakin = window.confirm(`Hapus "${butir.title ?? "butir ini"}"?`);
    if (!yakin) return;
    await fetch(`/api/admin/landing/items/${butir.id}`, { method: "DELETE" });
    onBerubah();
  }

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {ladang.map((item) => (
          <div
            key={item.nama}
            className={item.jenis === "panjang" || item.jenis === "gambar" ? "sm:col-span-2" : ""}
          >
            <Label htmlFor={`${butir.id}-${item.nama}`} className="text-xs">
              {item.label}
            </Label>

            {item.jenis === "gambar" ? (
              <div className="mt-1.5">
                <PemilihGambar
                  nilai={nilai[item.nama] || null}
                  pustaka={pustaka}
                  petunjuk={item.petunjuk}
                  onPustakaBerubah={onPustakaBerubah}
                  onPilih={(mediaId) => setNilai((lama) => ({ ...lama, [item.nama]: mediaId ?? "" }))}
                />
              </div>
            ) : item.nama === "icon" ? (
              // Ikon dipilih dari daftar tertutup, tidak diketik bebas: nama
              // ikon yang salah ketik menjadi lubang kosong di halaman yang
              // dibaca calon mitra, dan tidak ada yang memberi tahu.
              <select
                id={`${butir.id}-${item.nama}`}
                className="mt-1 h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={nilai[item.nama] ?? ""}
                onChange={(e) => setNilai((lama) => ({ ...lama, [item.nama]: e.target.value }))}
              >
                <option value="">— tanpa ikon —</option>
                {DAFTAR_IKON.map((pilihan) => (
                  <option key={pilihan.nilai} value={pilihan.nilai}>
                    {pilihan.label}
                  </option>
                ))}
              </select>
            ) : item.jenis === "panjang" ? (
              <textarea
                id={`${butir.id}-${item.nama}`}
                className="mt-1 min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={nilai[item.nama] ?? ""}
                onChange={(e) => setNilai((lama) => ({ ...lama, [item.nama]: e.target.value }))}
              />
            ) : (
              <Input
                id={`${butir.id}-${item.nama}`}
                className="mt-1 h-9"
                type={item.jenis === "angka" ? "number" : "text"}
                value={nilai[item.nama] ?? ""}
                onChange={(e) => setNilai((lama) => ({ ...lama, [item.nama]: e.target.value }))}
              />
            )}

            {item.petunjuk && item.jenis !== "gambar" ? (
              <p className="mt-1 text-xs text-muted-foreground">{item.petunjuk}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <Checkbox checked={tampil} onCheckedChange={(v) => setTampil(v === true)} />
          Tampilkan
        </label>

        {sukses ? <span className="text-xs text-emerald-600">Tersimpan</span> : null}

        <div className="ml-auto flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="size-8" disabled={pertama} onClick={() => geser("naik")} title="Naikkan">
            <ChevronUp className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-8" disabled={terakhir} onClick={() => geser("turun")} title="Turunkan">
            <ChevronDown className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={hapus} title="Hapus">
            <Trash2 className="size-4" />
          </Button>
          <Button type="button" size="sm" disabled={menyimpan} onClick={simpan}>
            {menyimpan ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Simpan
          </Button>
        </div>
      </div>
    </div>
  );
}
