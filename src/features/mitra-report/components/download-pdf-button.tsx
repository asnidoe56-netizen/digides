"use client";

import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/formatting/money";
import type { TransactionWithDetail } from "@/repositories/transaction.repository";
import type { WalletLedgerEntryWithOwner } from "@/repositories/wallet.repository";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const LEDGER_TYPE_LABEL: Record<string, string> = {
  TOPUP: "Top Up",
  DEBIT: "Transaksi",
  RESERVE: "Reserve",
  RELEASE: "Release",
  REFUND: "Refund",
  COMMISSION: "Komisi",
  PAYOUT: "Payout",
  ADJUSTMENT: "Adjustment",
  TRANSFER_OUT: "Transfer Keluar",
  TRANSFER_IN: "Transfer Masuk",
};

interface BaseProps {
  fullName: string;
  periodLabel: string;
}

export type DownloadPdfButtonProps =
  | (BaseProps & { kind: "transaksi"; transactions: TransactionWithDetail[] })
  | (BaseProps & { kind: "mutasi"; entries: WalletLedgerEntryWithOwner[] })
  | (BaseProps & {
      kind: "rekap";
      transactionCount: number;
      transactionValue: string;
      totalMasuk: string;
      totalKeluar: string;
      breakdown: Array<{ label: string; amount: string }>;
    });

const TAB_TITLE: Record<DownloadPdfButtonProps["kind"], string> = {
  transaksi: "Laporan Transaksi",
  mutasi: "Laporan Mutasi",
  rekap: "Laporan Rekap",
};

// A real .pdf file, generated and saved entirely client-side — no server
// round trip, no browser print dialog (that's what ExportPdfButton/
// window.print did before; this is the direct-download alternative asked
// for on top of it). Each tab passes only the data it already fetched, so
// the PDF always matches exactly what's on screen for the active
// tab/period.
export function DownloadPdfButton(props: DownloadPdfButtonProps) {
  function handleDownload() {
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text(TAB_TITLE[props.kind], 14, 16);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(props.fullName, 14, 23);
    doc.text(`Periode: ${props.periodLabel}`, 14, 29);
    doc.setTextColor(0);

    if (props.kind === "transaksi") {
      autoTable(doc, {
        startY: 35,
        head: [["Tanggal", "Produk", "Kategori", "No. Pelanggan", "Status", "Harga"]],
        body: props.transactions.map((transaction) => [
          dateFormatter.format(new Date(transaction.created_at)),
          transaction.product_name,
          transaction.category_name ?? "-",
          transaction.customer_number,
          transaction.status,
          formatMoney(transaction.selling_price),
        ]),
        styles: { fontSize: 9 },
      });
    } else if (props.kind === "mutasi") {
      autoTable(doc, {
        startY: 35,
        head: [["Tanggal", "Jenis", "Jumlah"]],
        body: props.entries.map((entry) => [
          dateFormatter.format(new Date(entry.created_at)),
          LEDGER_TYPE_LABEL[entry.type] ?? entry.type,
          formatMoney(entry.amount),
        ]),
        styles: { fontSize: 9 },
      });
    } else {
      autoTable(doc, {
        startY: 35,
        head: [["Ringkasan", "Nilai"]],
        body: [
          ["Total Transaksi", `${props.transactionCount} (${formatMoney(props.transactionValue)})`],
          ["Mutasi Masuk", formatMoney(props.totalMasuk)],
          ["Mutasi Keluar", formatMoney(props.totalKeluar)],
        ],
        styles: { fontSize: 9 },
      });

      const afterSummary = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 60;
      autoTable(doc, {
        startY: afterSummary + 8,
        head: [["Rincian per Jenis", "Jumlah"]],
        body: props.breakdown.map((row) => [row.label, formatMoney(row.amount)]),
        styles: { fontSize: 9 },
      });
    }

    const fileName = `${TAB_TITLE[props.kind].replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleDownload}
      className="print:hidden h-10 gap-2 border-red-600 text-red-600 hover:bg-red-50"
    >
      <Download className="size-4" />
      Download PDF
    </Button>
  );
}
