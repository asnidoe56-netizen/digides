// Pembayaran tagihan (pascabayar). Lihat docs/product/PRD_PASCABAYAR.md dan
// dokumen terkunci §5f.

export type BillInquiryStatus = "SUCCESS" | "FAILED";

/** Satu hasil cek tagihan. Append-only: ia bukti apa yang dilihat mitra
 *  sebelum membayar, jadi barisnya tidak pernah diubah atau dihapus. */
export interface BillInquiry {
  id: string;
  /** Dipakai ulang sebagai transactions.idempotency_key saat dibayar. */
  ref_id: string;
  user_id: string;
  wallet_id: string;
  product_id: string;
  buyer_sku_code: string;
  customer_no: string;
  /** PBB/SAMSAT: bagian-bagian nomor sebelum digabung berkoma. */
  input_parts: Record<string, string> | null;
  /** {year} untuk PBB, {amount} untuk E-Money pascabayar. */
  extra_params: Record<string, string | number> | null;
  status: BillInquiryStatus;
  rc: string | null;
  message: string | null;
  customer_name: string | null;
  periode: string | null;
  bill_sheets: number | null;
  admin_fee: string | null;
  /** Yang dipotong dari deposit Digides; menjadi base_price transaksi. */
  provider_price: string | null;
  provider_selling_price: string | null;
  /** Biaya layanan Digides, dibekukan saat cek tagihan. */
  service_fee: string | null;
  /** Yang dibayar mitra; menjadi selling_price transaksi dan nilai RESERVE. */
  total_amount: string | null;
  bill_desc: unknown;
  raw_response: unknown;
  expires_at: Date;
  created_at: Date;
}
