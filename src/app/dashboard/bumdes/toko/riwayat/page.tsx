import { TokoRiwayatPage } from "@/features/mitra-toko/pages/toko-pages";

export const dynamic = "force-dynamic";

export default async function BumdesTokoRiwayatPage() {
  return <TokoRiwayatPage basePath="/dashboard/bumdes/toko" homeHref="/dashboard/bumdes/dashboard" />;
}
