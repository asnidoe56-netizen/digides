import { TokoRiwayatPage } from "@/features/mitra-toko/pages/toko-pages";

export const dynamic = "force-dynamic";

export default async function KonterTokoRiwayatPage() {
  return <TokoRiwayatPage basePath="/dashboard/konter/toko" homeHref="/dashboard/konter/dashboard" />;
}
