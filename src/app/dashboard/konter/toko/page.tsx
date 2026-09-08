import { TokoHomePage } from "@/features/mitra-toko/pages/toko-pages";

// Store balance and recent sales change constantly — never statically
// prerendered, same reasoning as every other mitra data page.
export const dynamic = "force-dynamic";

export default async function KonterTokoPage() {
  return <TokoHomePage basePath="/dashboard/konter/toko" homeHref="/dashboard/konter/dashboard" />;
}
