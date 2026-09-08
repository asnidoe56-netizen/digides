import { TokoStrukPage } from "@/features/mitra-toko/pages/toko-pages";

export const dynamic = "force-dynamic";

export default async function KonterTokoStrukPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TokoStrukPage basePath="/dashboard/konter/toko" homeHref="/dashboard/konter/dashboard" orderId={id} />;
}
