import { redirect } from "next/navigation";
import { HistoriView } from "@/features/mitra-histori";
import { getSession } from "@/lib/auth/session";
import { getTransactionCount, getTransactionList } from "@/services/transaction.service";
import { getWalletForMitraSession } from "@/services/wallet.service";

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

  const wallet = await getWalletForMitraSession(session.userId, session.roles);
  const filter = { walletId: wallet?.id, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };

  const [transactions, total] = await Promise.all([
    wallet ? getTransactionList(filter) : Promise.resolve([]),
    wallet ? getTransactionCount(filter) : Promise.resolve(0),
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
