import { redirect } from "next/navigation";
import { HistoriView } from "@/features/mitra-histori";
import { getSession } from "@/lib/auth/session";
import { getTransactionCount, getTransactionList } from "@/services/transaction.service";
import { listReadableWalletIds } from "@/services/wallet.service";

// Transaction history changes with every purchase — never statically
// prerendered.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function BumdesHistoriPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  // Both wallets this mitra may read — a purchase funded from their own
  // store's balance belongs to the store wallet and would otherwise be
  // missing from their own Histori.
  const walletIds = await listReadableWalletIds(session.userId, session.roles);
  const filter = { walletIds, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
  const hasWallet = walletIds.length > 0;

  const [transactions, total] = await Promise.all([
    hasWallet ? getTransactionList(filter) : Promise.resolve([]),
    hasWallet ? getTransactionCount(filter) : Promise.resolve(0),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <HistoriView
      homeHref="/dashboard/bumdes/dashboard"
      historiHref="/dashboard/bumdes/histori"
      transactions={transactions}
      page={page}
      totalPages={totalPages}
    />
  );
}
