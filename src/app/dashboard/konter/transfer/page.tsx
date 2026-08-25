import { redirect } from "next/navigation";
import { TransferFlow } from "@/features/mitra-transfer";
import { getSession } from "@/lib/auth/session";
import { listDirectDownlines } from "@/repositories/referral.repository";
import { getWalletForMitraSession } from "@/services/wallet.service";

// Downline list and balance change constantly — never statically
// prerendered.
export const dynamic = "force-dynamic";

export default async function KonterTransferPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [downlines, wallet] = await Promise.all([
    listDirectDownlines(session.userId),
    getWalletForMitraSession(session.userId, session.roles),
  ]);

  return (
    <TransferFlow
      homeHref="/dashboard/konter/dashboard"
      downlines={downlines}
      availableBalance={wallet?.available_balance ?? "0"}
    />
  );
}
