import { TokoProdukPage } from "@/features/mitra-toko/pages/toko-pages";

export const dynamic = "force-dynamic";

export default async function KonterTokoProdukPage() {
  return <TokoProdukPage basePath="/dashboard/konter/toko" homeHref="/dashboard/konter/dashboard" />;
}
