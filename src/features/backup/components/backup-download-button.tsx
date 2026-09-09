"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mengunduh lewat fetch, bukan tautan biasa.
//
// Sebuah <a download> akan bekerja, tapi berkasnya disusun di server dan
// pada basis data yang sudah berjalan sebulan itu butuh beberapa detik —
// dengan tautan biasa, layar tidak menunjukkan apa pun selama itu dan
// admin menekannya lagi. Menyusun dua ekspor sekaligus di server bukan
// hal yang perlu terjadi karena sebuah tombol tidak bisa bilang "sabar".
export function BackupDownloadButton() {
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setIsPreparing(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/backup");
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menyiapkan berkas.");
      }

      // Nama berkas diambil dari header server, bukan disusun ulang di
      // sini — supaya cap waktu pada namanya adalah waktu berkasnya
      // benar-benar dibuat, bukan waktu jam di laptop yang mengunduh.
      const disposition = response.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename="(.+?)"/);
      const filename = match?.[1] ?? "digides_data.json";

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal mengunduh.");
    } finally {
      setIsPreparing(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" onClick={download} disabled={isPreparing}>
        {isPreparing ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        {isPreparing ? "Menyiapkan…" : "Unduh JSON"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
