import { Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AppReleaseManager } from "@/features/app-release";
import { daftarRilis } from "@/services/app-release.service";

// Selalu segar: yang penting di halaman ini adalah rilis mana yang SEDANG
// tayang, dan daftar yang di-cache akan membuat admin mengira sudah
// mengganti APK padahal belum.
export const dynamic = "force-dynamic";

export default async function AplikasiPage() {
  const releases = await daftarRilis();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Aplikasi Mitra"
        description="Berkas APK yang diunduh dari tombol Unduh Aplikasi di halaman depan."
      />

      <div className="flex gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
        <Info className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="text-muted-foreground">
          <p className="font-medium text-foreground">Satu rilis tayang pada satu waktu.</p>
          <p className="mt-1">
            Yang ditandai <strong>Tayang</strong> adalah berkas yang diterima siapa pun yang
            menekan tombol unduh. Rilis lama sengaja disimpan: kalau versi baru bermasalah,
            menayangkan kembali yang lama cukup satu klik.
          </p>
          <p className="mt-2">
            Android akan menampilkan peringatan &ldquo;sumber tidak dikenal&rdquo; saat memasang
            APK di luar Play Store. Itu wajar, dan panduan pemasangannya ada di halaman depan.
          </p>
        </div>
      </div>

      <AppReleaseManager initialReleases={releases} />
    </div>
  );
}
