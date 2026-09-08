import { notFound, redirect } from "next/navigation";
import { HistoriDetailView } from "@/features/mitra-histori";
import { getSession } from "@/lib/auth/session";
import { getTransactionDetail } from "@/services/transaction.service";
import { listReadableWalletIds } from "@/services/wallet.service";

// Transaction status/token can change between requests (webhook-driven) —
// never statically prerendered.
export const dynamic = "force-dynamic";

export default async function BumdesHistoriDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  // Every wallet this mitra may read, including their own store's — a
  // store-funded purchase belongs to the store wallet, and checking only
  // the operating wallet made the buyer's own transaction 404 to them.
  const walletIds = await listReadableWalletIds(session.userId, session.roles);
  const { transaction } = walletIds.length > 0 ? await getTransactionDetail(id) : { transaction: null };

  // Same "not found" whether the id is bogus or belongs to another
  // account's wallet — never confirm that a transaction exists for
  // someone else.
  if (!transaction || !walletIds.includes(transaction.wallet_id)) {
    notFound();
  }

  return <HistoriDetailView historiHref="/dashboard/bumdes/histori" transaction={transaction} />;
}
