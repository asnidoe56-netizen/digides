import { randomUUID } from "crypto";
import { inquirePostpaidBill, type DigiflazzPascaResult } from "@/lib/digiflazz/postpaid";
import {
  countBillInquiriesSince,
  createBillInquiry,
  findBillInquiryById,
  findReusableBillInquiry,
} from "@/repositories/bill-inquiry.repository";
import {
  findBrandById,
  findCategoryById,
  findProductById,
  listBrands,
  listProducts,
} from "@/repositories/product.repository";
import { findTransactionByBillInquiryId } from "@/repositories/transaction.repository";
import { getActiveDigiflazzCredentials } from "@/services/digiflazz.service";
import { getEffectiveMarkupsByProductId, getEffectiveMarkupValue } from "@/services/pricing.service";
import {
  executePostpaidPayment,
  verifyTransactionAuth,
  type TransactionAuth,
} from "@/services/transaction.service";
import type { BillInquiry } from "@/types/postpaid";
import type { Transaction } from "@/types/transaction";
import type { WalletChannel } from "@/types/wallet";

// Cek tagihan untuk produk + nomor yang sama dalam jendela ini memakai hasil
// sebelumnya, tanpa memanggil Digiflazz lagi. Digiflazz sendiri meminta
// panggilan untuk data yang sama tidak diulang dalam kurang dari satu menit
// (PRD Pascabayar §7.15 & §7.17).
const JENDELA_PAKAI_ULANG_DETIK = 60;
// Pagar tambahan: cek tagihan murah bagi mitra, tapi rate limit Digiflazz
// (rc 86) berlaku untuk seluruh akun Digides, bukan per mitra.
const BATAS_CEK_PER_MENIT = 10;
// Masa berlaku hasil cek tagihan — keputusan Digides, bukan aturan Digiflazz.
// Tagihan bisa dibayar di loket lain, atau dendanya bertambah, di antara pagi
// dan sore. Cek tagihan yang basi lebih baik diulang daripada dibayar.
const MASA_BERLAKU_MS = 30 * 60 * 1000;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

// Digiflazz hanya menerima pembayaran di TANGGAL YANG SAMA dengan cek
// tagihannya, jadi masa berlakunya tidak pernah melewati akhir hari WIB —
// berapa pun sisa 30 menitnya (§5f batasan 2).
export function hitungMasaBerlakuCekTagihan(sekarang: Date = new Date()): Date {
  const wib = new Date(sekarang.getTime() + WIB_OFFSET_MS);
  const akhirHariWib =
    Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate(), 23, 59, 59) - WIB_OFFSET_MS;
  return new Date(Math.min(sekarang.getTime() + MASA_BERLAKU_MS, akhirHariWib));
}

export interface InquireBillInput {
  actorUserId: string;
  walletId: string;
  productId: string;
  /** Nomor pelanggan tunggal (PLN, PDAM, internet, HP). */
  customerNo?: string;
  /** PBB & SAMSAT: dua bagian yang digabung berkoma oleh server, bukan klien. */
  inputParts?: { kode_bayar?: string; nomor_identitas?: string };
  /** PBB saja. */
  year?: string;
  /** E-Money pascabayar saja. */
  amount?: number;
}

// Koma adalah pemisah dua bagian nomor pada PBB dan SAMSAT. Satu koma yang
// tidak semestinya mengubah arti nomor, jadi ditolak di sini — bukan
// diserahkan ke Digiflazz untuk ditebak (PRD §7.12).
function susunNomorPelanggan(input: InquireBillInput): string {
  const bagian = input.inputParts;
  if (bagian?.kode_bayar || bagian?.nomor_identitas) {
    const kode = (bagian.kode_bayar ?? "").trim();
    const identitas = (bagian.nomor_identitas ?? "").trim();
    if (!kode || !identitas) {
      throw new Error("Kode pembayaran dan nomor identitas harus diisi keduanya.");
    }
    if (kode.includes(",") || identitas.includes(",")) {
      throw new Error("Kode pembayaran dan nomor identitas tidak boleh memuat koma.");
    }
    return `${kode},${identitas}`;
  }

  const nomor = (input.customerNo ?? "").trim();
  if (!nomor) {
    throw new Error("Nomor pelanggan harus diisi.");
  }
  if (nomor.includes(",")) {
    throw new Error("Nomor pelanggan tidak boleh memuat koma.");
  }
  return nomor;
}

// Pesan Digiflazz umumnya sudah bisa dibaca mitra ("Tagihan sudah lunas",
// "Nomor tidak ditemukan"), jadi diteruskan apa adanya. Yang kosong atau
// terlalu panjang diganti pesan netral — mitra tidak pernah melihat rc mentah.
function pesanCekTagihanGagal(hasil: DigiflazzPascaResult): string {
  const pesan = (hasil.message ?? "").trim();
  if (!pesan || pesan.length > 160) {
    return "Tagihan tidak bisa dicek saat ini. Periksa kembali nomor pelanggannya, lalu coba lagi.";
  }
  return pesan;
}

// Langkah 1 dari dua: menanyakan tagihan. TIDAK membuat baris transaksi dan
// TIDAK menahan saldo — kebanyakan cek tagihan tidak berakhir dibayar, dan
// buku besar tidak boleh penuh pasangan RESERVE/RELEASE yang tidak pernah
// menjadi apa-apa (PRD §7.1).
export async function inquireBill(input: InquireBillInput): Promise<BillInquiry> {
  const product = await findProductById(input.productId);
  if (!product) {
    throw new Error("Produk tidak ditemukan");
  }
  if (product.product_type !== "POSTPAID") {
    throw new Error("Produk ini bukan tagihan pascabayar.");
  }
  if (product.admin_disabled || product.status === "DISABLED") {
    throw new Error("Layanan tagihan ini sedang dinonaktifkan.");
  }
  if (product.category_id) {
    const category = await findCategoryById(product.category_id);
    if (category && category.status === "DISABLED") {
      throw new Error("Layanan tagihan ini sedang tidak tersedia.");
    }
  }
  if (product.brand_id) {
    const brand = await findBrandById(product.brand_id);
    if (brand && brand.status === "DISABLED") {
      throw new Error("Layanan tagihan ini sedang tidak tersedia.");
    }
  }

  const customerNo = susunNomorPelanggan(input);

  const jumlahTerakhir = await countBillInquiriesSince(input.actorUserId, 60);
  if (jumlahTerakhir >= BATAS_CEK_PER_MENIT) {
    throw new Error("Terlalu banyak cek tagihan dalam satu menit. Tunggu sebentar, lalu coba lagi.");
  }

  const sebelumnya = await findReusableBillInquiry({
    userId: input.actorUserId,
    productId: input.productId,
    customerNo,
    withinSeconds: JENDELA_PAKAI_ULANG_DETIK,
  });
  if (sebelumnya) {
    return sebelumnya;
  }

  const credentials = await getActiveDigiflazzCredentials();
  if (!credentials) {
    throw new Error("Digiflazz belum dikonfigurasi");
  }

  // Biaya layanan Digides, dibekukan bersama hasil cek tagihan. Aturan markup
  // GLOBAL tidak berlaku untuk pascabayar (PRD §7.10), jadi angka ini 0 sampai
  // ada aturan yang dibuat sadar per kategori, brand, atau produk.
  const serviceFee = Number(await getEffectiveMarkupValue(product));
  const refId = `pasca-${randomUUID()}`;
  const expiresAt = hitungMasaBerlakuCekTagihan();

  const hasil = await inquirePostpaidBill({
    baseUrl: credentials.baseUrl,
    username: credentials.username,
    apiKey: credentials.apiKey,
    buyerSkuCode: product.sku,
    customerNo,
    refId,
    testing: credentials.mode === "development",
    year: input.year,
    amount: input.amount,
  });

  const dasarTersimpan = {
    ref_id: refId,
    user_id: input.actorUserId,
    wallet_id: input.walletId,
    product_id: product.id,
    buyer_sku_code: product.sku,
    customer_no: customerNo,
    input_parts: input.inputParts ?? null,
    extra_params:
      input.year !== undefined || input.amount !== undefined
        ? {
            ...(input.year !== undefined ? { year: input.year } : {}),
            ...(input.amount !== undefined ? { amount: input.amount } : {}),
          }
        : null,
    rc: hasil.rc ?? null,
    message: hasil.message ?? null,
    raw_response: hasil,
    expires_at: expiresAt,
  };

  // Cek tagihan yang gagal ikut disimpan: alasan penolakan Digiflazz harus
  // bisa ditelusuri tanpa menebak, dan tanpa memanggil mereka lagi.
  if (hasil.status !== "Sukses") {
    await createBillInquiry({ ...dasarTersimpan, status: "FAILED" });
    throw new Error(pesanCekTagihanGagal(hasil));
  }

  const adminFee = Number(hasil.admin ?? 0);
  const providerPrice = Number(hasil.price ?? 0);
  const providerSelling = Number(hasil.selling_price ?? 0);
  // Dasar tagihan ke mitra adalah harga jual saran Digiflazz. Kalau medan itu
  // tidak terkirim (belum pernah teramati), dipakai `price` — supaya kita
  // tidak pernah menagih lebih kecil daripada yang dipotong dari deposit.
  const dasar = providerSelling > 0 ? providerSelling : providerPrice;
  const total = dasar + serviceFee;

  if (!(providerPrice > 0) || !(total > 0) || total < providerPrice) {
    await createBillInquiry({
      ...dasarTersimpan,
      status: "FAILED",
      message: "Nominal dari Digiflazz tidak lengkap",
    });
    throw new Error("Digiflazz tidak mengirim nominal tagihan yang lengkap. Silakan cek tagihan lagi.");
  }

  const rincian = (hasil.desc ?? null) as { lembar_tagihan?: number | string } | null;
  const lembar = Number(rincian?.lembar_tagihan ?? 0);

  return createBillInquiry({
    ...dasarTersimpan,
    status: "SUCCESS",
    customer_name: hasil.customer_name ?? null,
    periode: hasil.periode ?? null,
    bill_sheets: Number.isFinite(lembar) && lembar > 0 ? lembar : null,
    admin_fee: adminFee,
    provider_price: providerPrice,
    provider_selling_price: providerSelling > 0 ? providerSelling : null,
    service_fee: serviceFee,
    total_amount: total,
    bill_desc: hasil.desc ?? null,
  });
}

export interface PayBillInput {
  actorUserId: string;
  walletId: string;
  billInquiryId: string;
  auth: TransactionAuth;
  channel: WalletChannel;
}

// Langkah 2: membayar tagihan yang sudah dicek. Semua angka diambil dari hasil
// cek tagihan, tidak ada yang dihitung ulang di sini (§5f batasan 1).
export async function payBill(input: PayBillInput): Promise<Transaction> {
  const inquiry = await findBillInquiryById(input.billInquiryId);
  if (!inquiry) {
    throw new Error("Hasil cek tagihan tidak ditemukan. Silakan cek tagihan lagi.");
  }
  if (inquiry.user_id !== input.actorUserId) {
    throw new Error("Hasil cek tagihan ini bukan milik akun Anda.");
  }
  if (inquiry.wallet_id !== input.walletId) {
    throw new Error("Dompet pembayaran berbeda dengan saat cek tagihan.");
  }
  if (inquiry.status !== "SUCCESS") {
    throw new Error("Cek tagihan ini tidak berhasil. Silakan cek tagihan lagi.");
  }
  if (inquiry.expires_at.getTime() <= Date.now()) {
    throw new Error("Tagihan ini sudah kedaluwarsa. Silakan cek tagihan ulang sebelum membayar.");
  }

  await verifyTransactionAuth(input.actorUserId, input.auth);

  // Sudah pernah dibayar: kembalikan transaksinya, jangan pernah membayar
  // kedua kali. Pagar sebenarnya ada di database (bill_inquiry_id UNIQUE dan
  // idempotency_key), ini yang memberi jawaban wajar lebih dulu.
  const sudahAda = await findTransactionByBillInquiryId(inquiry.id);
  if (sudahAda) {
    return sudahAda;
  }

  return executePostpaidPayment({
    inquiry,
    actorUserId: input.actorUserId,
    channel: input.channel,
  });
}

export { findBillInquiryById };

export interface PostpaidCatalogItem {
  id: string;
  product_name: string;
  brand_id: string | null;
  brand_name: string | null;
  /** Biaya admin dari Digiflazz; ditagihkan ke pelanggan. */
  admin_fee: string | null;
  /** Biaya layanan Digides yang akan ditambahkan saat cek tagihan. */
  service_fee: string;
}

// Katalog tagihan untuk mitra. Komisi Digiflazz sengaja TIDAK ikut dikirim:
// itu margin Digides, bukan urusan layar mitra.
export async function getPostpaidCatalog(): Promise<PostpaidCatalogItem[]> {
  const [products, brands] = await Promise.all([
    listProducts({ productType: "POSTPAID", status: "ACTIVE", excludeAdminDisabled: true, limit: 200 }),
    listBrands("POSTPAID"),
  ]);

  const brandAktif = new Map(brands.filter((b) => b.status === "ACTIVE").map((b) => [b.id, b.name]));
  const tersedia = products.filter((p) => !p.brand_id || brandAktif.has(p.brand_id));
  const markup = await getEffectiveMarkupsByProductId(tersedia.map((p) => p.id));

  return tersedia.map((p) => ({
    id: p.id,
    product_name: p.product_name,
    brand_id: p.brand_id,
    brand_name: p.brand_id ? (brandAktif.get(p.brand_id) ?? null) : null,
    admin_fee: p.admin_fee,
    service_fee: markup[p.id] ?? "0",
  }));
}
