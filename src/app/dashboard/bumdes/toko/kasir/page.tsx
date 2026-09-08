import { TokoKasirPage } from "@/features/mitra-toko/pages/toko-pages";

export const dynamic = "force-dynamic";

export default async function BumdesTokoKasirPage() {
  return <TokoKasirPage basePath="/dashboard/bumdes/toko" homeHref="/dashboard/bumdes/dashboard" />;
}
