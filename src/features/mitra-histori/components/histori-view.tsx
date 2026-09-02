import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PaginationControls } from "@/components/pagination-controls";
import type { TransactionWithDetail } from "@/repositories/transaction.repository";
import { HistoriList } from "./histori-list";

export interface HistoriViewProps {
  homeHref: string;
  historiHref: string;
  transactions: TransactionWithDetail[];
  page: number;
  totalPages: number;
}

export function HistoriView({ homeHref, historiHref, transactions, page, totalPages }: HistoriViewProps) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 bg-red-600 px-4 py-3 text-white">
        <Link
          href={homeHref}
          aria-label="Kembali"
          className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-semibold">Histori Transaksi</h1>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <HistoriList transactions={transactions} historiHref={historiHref} />
        <PaginationControls
          page={page}
          totalPages={totalPages}
          buildHref={(targetPage) => (targetPage > 1 ? `${historiHref}?page=${targetPage}` : historiHref)}
        />
      </div>
    </div>
  );
}
