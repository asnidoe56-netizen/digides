"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Smartphone,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { AppReleaseRow } from "@/types/app-release";

function ukuran(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function tanggal(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AppReleaseManager({ initialReleases }: { initialReleases: AppReleaseRow[] }) {
  const [releases, setReleases] = useState(initialReleases);
  const [file, setFile] = useState<File | null>(null);
  const [versionName, setVersionName] = useState("");
  const [versionCode, setVersionCode] = useState("");
  const [notes, setNotes] = useState("");
  const [aktifkan, setAktifkan] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function muatUlang() {
    const response = await fetch("/api/admin/app-releases");
    if (response.ok) {
      const body = await response.json();
      setReleases(body.releases);
    }
  }

  // Diunggah dengan XMLHttpRequest, bukan fetch. Berkasnya 30 MB dan di
  // jaringan kantor desa itu bisa satu dua menit; fetch tidak bisa
  // memberitahu sudah sampai mana, dan layar yang diam selama dua menit
  // akan ditekan ulang atau ditutup.
  function unggah(event: React.FormEvent) {
    event.preventDefault();
    if (!file || progress !== null) return;

    setError(null);
    setSukses(null);
    setProgress(0);

    const form = new FormData();
    form.set("file", file);
    form.set("version_name", versionName.trim());
    form.set("version_code", versionCode.trim());
    form.set("release_notes", notes.trim());
    form.set("aktifkan", aktifkan ? "true" : "false");
    const versiTerunggah = versionName.trim();

    const request = new XMLHttpRequest();
    request.open("POST", "/api/admin/app-releases");
    request.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    });
    request.addEventListener("load", () => {
      setProgress(null);
      if (request.status === 201) {
        setSukses(`Versi ${versiTerunggah} berhasil diunggah.`);
        setFile(null);
        setVersionName("");
        setVersionCode("");
        setNotes("");
        if (inputRef.current) inputRef.current.value = "";
        void muatUlang();
        return;
      }
      let pesan = "Gagal mengunggah berkas.";
      try {
        pesan = JSON.parse(request.responseText).error ?? pesan;
      } catch {
        // Nginx menolak sebelum aplikasi sempat menjawab: jawabannya HTML,
        // bukan JSON. Ukuran badan permintaan adalah sebab yang hampir pasti.
        if (request.status === 413) {
          pesan = "Server menolak berkas sebesar ini. Batas unggahan di server perlu dinaikkan.";
        }
      }
      setError(pesan);
    });
    request.addEventListener("error", () => {
      setProgress(null);
      setError("Sambungan terputus saat mengunggah. Coba lagi.");
    });
    request.send(form);
  }

  async function aktifkanRilis(id: string) {
    setSibuk(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/app-releases/${id}/activate`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal mengaktifkan rilis.");
      }
      await muatUlang();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal mengaktifkan rilis.");
    } finally {
      setSibuk(null);
    }
  }

  async function hapusRilis(release: AppReleaseRow) {
    const yakin = window.confirm(
      `Hapus versi ${release.version_name} (${release.version_code})? Berkasnya ikut terhapus dari server dan tidak bisa dikembalikan.`,
    );
    if (!yakin) return;

    setSibuk(release.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/app-releases/${release.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menghapus rilis.");
      }
      await muatUlang();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menghapus rilis.");
    } finally {
      setSibuk(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={unggah} className="rounded-lg border p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <UploadCloud className="size-4" />
          Unggah APK baru
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="apk">Berkas APK</Label>
            <Input
              id="apk"
              ref={inputRef}
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              className="mt-1"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError(null);
                setSukses(null);
              }}
            />
            {file ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {file.name} — {ukuran(file.size)}
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="version-name">Nama versi</Label>
            <Input
              id="version-name"
              className="mt-1"
              placeholder="1.11.4"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="version-code">Nomor build</Label>
            <Input
              id="version-code"
              className="mt-1"
              inputMode="numeric"
              placeholder="4144"
              value={versionCode}
              onChange={(e) => setVersionCode(e.target.value)}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="notes">Catatan perubahan (opsional)</Label>
            <Input
              id="notes"
              className="mt-1"
              placeholder="Tambah menu Bayar Tagihan dan layar pembuka"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={aktifkan} onCheckedChange={(nilai) => setAktifkan(nilai === true)} />
          Langsung tayangkan di halaman depan
        </label>

        {progress !== null ? (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-red-600 transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Mengunggah {progress}% — jangan tutup halaman ini.
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : null}
        {sukses ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="size-4" />
            {sukses}
          </p>
        ) : null}

        <Button type="submit" className="mt-4" disabled={!file || progress !== null}>
          {progress !== null ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UploadCloud className="size-4" />
          )}
          {progress !== null ? "Mengunggah…" : "Unggah"}
        </Button>
      </form>

      <div className="rounded-lg border">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Smartphone className="size-4" />
          <p className="text-sm font-medium">Riwayat rilis</p>
        </div>

        {releases.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Belum ada APK yang diunggah. Tombol unduh di halaman depan belum bisa dipakai.
          </p>
        ) : (
          <div className="divide-y">
            {releases.map((release) => (
              <div
                key={release.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    Versi {release.version_name}
                    <span className="text-xs font-normal text-muted-foreground">
                      build {release.version_code}
                    </span>
                    {release.is_active ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Tayang
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {ukuran(Number(release.file_size))} · {tanggal(release.created_at)}
                    {release.uploader_name ? ` · ${release.uploader_name}` : ""}
                  </p>
                  {release.release_notes ? (
                    <p className="mt-1 text-xs text-muted-foreground">{release.release_notes}</p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  {release.is_active ? null : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={sibuk === release.id}
                      onClick={() => aktifkanRilis(release.id)}
                    >
                      {sibuk === release.id ? <Loader2 className="size-4 animate-spin" /> : null}
                      Tayangkan
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={release.is_active || sibuk === release.id}
                    onClick={() => hapusRilis(release)}
                    title={
                      release.is_active
                        ? "Rilis yang sedang tayang tidak bisa dihapus"
                        : "Hapus rilis ini"
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
