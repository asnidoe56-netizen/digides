"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface RilisTerbaru {
  version_name: string;
  file_size: number;
  released_at: string;
}

/**
 * Tombol unduh APK di halaman depan.
 *
 * Tombolnya adalah tautan biasa, BUKAN tombol yang memanggil JavaScript:
 * ia harus tetap bekerja di HP lama dan di peramban dalam aplikasi WhatsApp,
 * tempat tautan ini paling sering dibuka. Keterangan versinya diambil
 * belakangan dan hanya sebagai tambahan — kalau permintaannya gagal,
 * tombolnya tetap bisa ditekan.
 */
export function DownloadAppButton({
  variant = "terang",
}: {
  variant?: "terang" | "gelap";
}) {
  const [rilis, setRilis] = useState<RilisTerbaru | null>(null);

  useEffect(() => {
    let batal = false;
    fetch("/api/app/latest")
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!batal && body?.release) setRilis(body.release);
      })
      .catch(() => {
        // Keterangan versi tidak muncul. Tombolnya tetap ada.
      });
    return () => {
      batal = true;
    };
  }, []);

  const gaya =
    variant === "terang"
      ? "bg-white text-neutral-900 hover:bg-neutral-100"
      : "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50";

  return (
    <div className="flex flex-col items-center gap-1.5 sm:items-start">
      <a
        href="/api/app/download"
        className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold shadow-sm transition-colors ${gaya}`}
      >
        <Download className="size-5" />
        Unduh Aplikasi
      </a>
      <p
        className={`text-xs ${variant === "terang" ? "text-neutral-400" : "text-neutral-500"}`}
      >
        {rilis
          ? `Android · Versi ${rilis.version_name} · ${(rilis.file_size / 1024 / 1024).toFixed(0)} MB`
          : "Android · APK langsung"}
      </p>
    </div>
  );
}
