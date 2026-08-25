import { PageHeader } from "@/components/page-header";
import { MitraList, MitraRegisterDialog } from "@/features/mitra";
import { getMitraList } from "@/services/bumdes.service";

// Wallet balances shown here change whenever a top up is sent — never
// statically cached, same reasoning as the Wallet and Markup pages.
export const dynamic = "force-dynamic";

export default async function SuperAdminMitraPage() {
  const mitra = await getMitraList();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mitra"
        description="Kelola BUMDes/mitra: daftarkan akun baru, lihat daftar mitra, dan kirim saldo."
        actions={<MitraRegisterDialog />}
      />
      <MitraList mitra={mitra} />
    </div>
  );
}
