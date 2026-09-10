export type CashbackScopeType = "GLOBAL" | "CATEGORY" | "BRAND" | "PRODUCT";
export type CashbackType = "NOMINAL" | "PERCENTAGE";

// PRD Cashback §4. Bentuknya meniru MarkupRule dengan sengaja — cakupan
// yang sama, priority yang sama, masa berlaku yang sama — supaya admin
// yang sudah memahami menu Markup tidak perlu mempelajari model kedua.
//
// Bedanya satu: tidak ada owner_type. Cashback selalu dibayar dari margin
// Digides pusat, dan membiarkan BUMDes memasang cashback dari margin orang
// lain adalah cara membuat kerugian yang tidak seorang pun merasa
// menyebabkannya.
export interface CashbackRule {
  id: string;
  scope_type: CashbackScopeType;
  category_id: string | null;
  brand_id: string | null;
  product_id: string | null;
  cashback_type: CashbackType;
  /** NOMINAL: rupiah. PERCENTAGE: persen dari MARGIN, bukan harga jual. */
  cashback_value: string;
  /** Null atau 0 berarti tidak ada batas bawah — bukan batas nol. */
  min_transaction: string | null;
  /** Null atau 0 berarti tidak ada batas atas — bukan batas nol. */
  max_cashback: string | null;
  priority: number;
  effective_from: Date;
  effective_until: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Satu baris per cashback yang benar-benar dibayarkan. Append-only.
export interface CashbackLedgerEntry {
  id: string;
  transaction_id: string;
  beneficiary_user_id: string;
  wallet_id: string;
  cashback_rule_id: string | null;
  amount: string;
  created_at: Date;
}

/** Hasil perhitungan sebelum dibayar — dipakai juga oleh panel admin untuk
 *  menunjukkan berapa yang AKAN benar-benar terbayar, bukan berapa yang
 *  diketik (PRD §6.2). */
export interface CashbackCalculation {
  /** Yang diminta aturan, sebelum dibatasi apa pun. */
  requested: number;
  /** Margin Digides pada transaksi ini: selling_price − base_price. */
  margin: number;
  /** Komisi yang sudah dijanjikan ke upline dari margin yang sama. */
  commission: number;
  /** Yang benar-benar dibayar setelah semua pembatas. */
  payable: number;
  /** Kenapa jumlahnya berkurang, kalau berkurang. */
  cappedBy: "NONE" | "MAX_CASHBACK" | "REMAINING_MARGIN";
}
