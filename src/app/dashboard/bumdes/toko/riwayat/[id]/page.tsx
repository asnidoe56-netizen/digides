import { TokoStrukPage } from "@/features/mitra-toko/pages/toko-pages";

export const dynamic = "force-dynamic";

export default async function BumdesTokoStrukPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TokoStrukPage basePath="/dashboard/bumdes/toko" homeHref="/dashboard/bumdes/dashboard" orderId={id} />;
}
