import { TokoKasirPage } from "@/features/mitra-toko/pages/toko-pages";

export const dynamic = "force-dynamic";

export default async function KonterTokoKasirPage() {
  return <TokoKasirPage basePath="/dashboard/konter/toko" homeHref="/dashboard/konter/dashboard" />;
}
