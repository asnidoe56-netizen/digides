import { TokoProdukPage } from "@/features/mitra-toko/pages/toko-pages";

export const dynamic = "force-dynamic";

export default async function BumdesTokoProdukPage() {
  return <TokoProdukPage basePath="/dashboard/bumdes/toko" homeHref="/dashboard/bumdes/dashboard" />;
}
