import { ExternalLink, Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PengelolaHalamanDepan } from "@/features/landing-admin/components/pengelola-halaman-depan";
import { ambilHalamanDepanUntukAdmin } from "@/services/landing.service";
import { daftarGambar } from "@/services/media.service";

// Selalu segar: yang penting di halaman ini adalah isi yang SEDANG tayang,
// dan daftar yang di-cache akan membuat admin mengira perubahannya hilang.
export const dynamic = "force-dynamic";

export default async function LandingAdminPage() {
  const [halaman, pustaka] = await Promise.all([ambilHalamanDepanUntukAdmin(), daftarGambar()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Halaman Depan"
        description="Seluruh isi digidespay.pro — teks, foto, urutan, dan profil — diubah dari sini."
      />

      <div className="flex gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
        <Info className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="text-muted-foreground">
          <p className="font-medium text-foreground">
            Perubahan langsung tayang, tanpa menunggu penerapan ulang.
          </p>
          <p className="mt-1">
            Begitu Anda menekan Simpan, halaman depan disusun ulang saat itu juga. Muat ulang
            halaman depan di tab lain untuk melihatnya.
          </p>
          <p className="mt-2">
            Bagian yang sedang kosong tidak akan menyisakan ruang kosong di halaman &mdash; ia
            hilang sendiri. Foto yang belum diisi tampil sebagai kotak bertanda, bukan foto
            orang lain.
          </p>
          <a
            className="mt-3 inline-flex items-center gap-1.5 font-medium text-foreground underline underline-offset-4"
            href="/"
            target="_blank"
            rel="noreferrer"
          >
            Buka halaman depan
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>

      <PengelolaHalamanDepan bagianAwal={halaman.sections} pustakaAwal={pustaka} />
    </div>
  );
}
