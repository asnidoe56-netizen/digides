import { notFound, redirect } from "next/navigation";
import { HistoriDetailView } from "@/features/mitra-histori";
import { getSession } from "@/lib/auth/session";
import { getTransactionDetail } from "@/services/transaction.service";
import { getWalletForMitraSession } from "@/services/wallet.service";

// Transaction status/token can change between requests (webhook-driven) —
// never statically prerendered.
export const dynamic = "force-dynamic";

export default async function KonterHistoriDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const wallet = await getWalletForMitraSession(session.userId, session.roles);
  const { transaction } = wallet ? await getTransactionDetail(id) : { transaction: null };

  // Same "not found" whether the id is bogus or belongs to another
  // account's wallet — never confirm that a transaction exists for
  // someone else.
  if (!wallet || !transaction || transaction.wallet_id !== wallet.id) {
    notFound();
  }

  return <HistoriDetailView historiHref="/dashboard/konter/histori" transaction={transaction} />;
}
