"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { AlertTriangle, ImageOff, Loader2, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { LandingMedia } from "@/types/landing";

/**
 * Pustaka gambar halaman depan.
 *
 * Gambar yang diunggah dikecilkan dan diubah ke WebP di server, jadi admin
 * boleh mengunggah foto mentah apa adanya tanpa memikirkan ukurannya — kalau
 * pengecilannya diserahkan kepada orang, cepat atau lambat ada foto 4 MB yang
 * lolos dan halaman depannya menjadi berat tanpa ada yang menyadari.
 */
export function PemilihGambar({
  nilai,
  pustaka,
  onPilih,
  onPustakaBerubah,
  petunjuk,
}: {
  nilai: string | null;
  pustaka: LandingMedia[];
  onPilih: (mediaId: string | null) => void;
  onPustakaBerubah: () => void;
  petunjuk?: string;
}) {
  const [terbuka, setTerbuka] = useState(false);
  const [mengunggah, setMengunggah] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const berkasRef = useRef<HTMLInputElement>(null);

  const terpilih = pustaka.find((m) => m.id === nilai) ?? null;

  async function unggah(file: File) {
    if (!alt.trim()) {
      setGalat("Isi dulu keterangan gambarnya. Pembaca yang memakai pembaca layar hanya punya kalimat itu.");
      return;
    }

    setMengunggah(true);
    setGalat(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("alt_text", alt.trim());

      const response = await fetch("/api/admin/media", { method: "POST", body: form });
      if (!response.ok) {
        const isi = await response.json().catch(() => null);
        throw new Error(isi?.error ?? "Gagal mengunggah gambar.");
      }
      const isi = await response.json();
      setAlt("");
      if (berkasRef.current) berkasRef.current.value = "";
      onPustakaBerubah();
      onPilih(isi.media.id);
      setTerbuka(false);
    } catch (caught) {
      setGalat(caught instanceof Error ? caught.message : "Gagal mengunggah gambar.");
    } finally {
      setMengunggah(false);
    }
  }

  async function hapus(media: LandingMedia) {
    const yakin = window.confirm(
      `Hapus gambar "${media.original_name}"? Bagian halaman yang memakainya akan kembali kosong.`,
    );
    if (!yakin) return;

    const response = await fetch(`/api/admin/media/${media.id}`, { method: "DELETE" });
    if (!response.ok) {
      const isi = await response.json().catch(() => null);
      setGalat(isi?.error ?? "Gagal menghapus gambar.");
      return;
    }
    if (nilai === media.id) onPilih(null);
    onPustakaBerubah();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {terpilih ? (
            <Image
              src={`/api/media/${terpilih.id}`}
              alt={terpilih.alt_text}
              width={160}
              height={160}
              className="size-full object-cover"
            />
          ) : (
            <ImageOff className="size-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <p className="truncate text-sm">
            {terpilih ? terpilih.original_name : "Belum ada gambar"}
          </p>

          <div className="flex flex-wrap gap-2">
            <Dialog open={terbuka} onOpenChange={setTerbuka}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  {terpilih ? "Ganti gambar" : "Pilih gambar"}
                </Button>
              </DialogTrigger>

              <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Pustaka gambar</DialogTitle>
                  <DialogDescription>
                    Gambar dikecilkan otomatis ke lebar 1600 piksel dan diubah ke WebP saat
                    diunggah, jadi tidak perlu disiapkan dulu.
                  </DialogDescription>
                </DialogHeader>

                <div className="rounded-lg border p-4">
                  <Label htmlFor="alt-gambar">Keterangan gambar (wajib)</Label>
                  <Input
                    id="alt-gambar"
                    className="mt-1"
                    placeholder="Kepala desa berjabat tangan dengan warga di balai desa"
                    value={alt}
                    onChange={(e) => setAlt(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Dibaca oleh pembaca layar dan mesin pencari. Jelaskan apa yang terlihat,
                    bukan nama berkasnya.
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <Input
                      ref={berkasRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      disabled={mengunggah}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void unggah(file);
                      }}
                    />
                    {mengunggah ? <Loader2 className="size-4 shrink-0 animate-spin" /> : <UploadCloud className="size-4 shrink-0 text-muted-foreground" />}
                  </div>
                </div>

                {galat ? (
                  <p className="flex items-start gap-2 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    {galat}
                  </p>
                ) : null}

                {pustaka.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Pustaka masih kosong.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {pustaka.map((media) => (
                      <div
                        key={media.id}
                        className={`group relative overflow-hidden rounded-lg border-2 transition-colors ${
                          nilai === media.id ? "border-red-600" : "border-transparent hover:border-muted-foreground/30"
                        }`}
                      >
                        <button
                          type="button"
                          className="block w-full"
                          onClick={() => {
                            onPilih(media.id);
                            setTerbuka(false);
                          }}
                        >
                          <Image
                            src={`/api/media/${media.id}`}
                            alt={media.alt_text}
                            width={320}
                            height={240}
                            className="aspect-[4/3] w-full object-cover"
                          />
                          <span className="block truncate px-2 py-1.5 text-left text-xs text-muted-foreground">
                            {media.original_name}
                          </span>
                        </button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 size-7 bg-background/80 opacity-0 transition-opacity group-hover:opacity-100"
                          title="Hapus dari pustaka"
                          onClick={() => hapus(media)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {terpilih ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => onPilih(null)}>
                Kosongkan
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {petunjuk ? <p className="text-xs text-muted-foreground">{petunjuk}</p> : null}
    </div>
  );
}
