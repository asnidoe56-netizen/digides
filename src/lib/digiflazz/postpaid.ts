import { createHash } from "crypto";

// Jalur pascabayar ke Digiflazz: cek tagihan (inq-pasca), bayar (pay-pasca),
// dan cek status (status-pasca). Endpoint-nya sama dengan prabayar
// (/v1/transaction) dan formula signature-nya juga sama persis
// — md5(username + apiKey + ref_id) — tapi jalurnya sengaja dibuat
// BERDAMPINGAN dengan submitDigiflazzTransaction, bukan menjadi cabang di
// dalamnya. Dokumen terkunci §5f aturan 1: mesin prabayar yang sudah terbukti
// tidak disentuh sama sekali oleh pekerjaan pascabayar.
//
// Perbedaan mendasar dari prabayar: nominal tagihan tidak diketahui sebelum
// ditanyakan, dan pembayaran WAJIB memakai ref_id yang sama dengan
// pertanyaannya, di tanggal yang sama.
function buildSignature(username: string, apiKey: string, refId: string): string {
  return createHash("md5").update(`${username}${apiKey}${refId}`).digest("hex");
}

export type DigiflazzPascaStatus = "Sukses" | "Gagal" | "Pending";

export interface DigiflazzPascaResult {
  ref_id: string;
  customer_no: string;
  customer_name?: string;
  buyer_sku_code: string;
  /** Biaya admin yang ditagihkan ke pelanggan. */
  admin?: number;
  message: string;
  status: DigiflazzPascaStatus;
  rc: string;
  periode?: string;
  buyer_last_saldo?: number;
  /** Yang dipotong dari deposit Digides. Menjadi transactions.base_price. */
  price?: number;
  /** Harga jual saran Digiflazz (nilai tagihan + admin). */
  selling_price?: number;
  /** Hanya pada pembayaran: nomor referensi bukti bayar. */
  sn?: string;
  /** Rincian tagihan; bentuknya berbeda untuk tiap jenis (PLN, PDAM, dst.). */
  desc?: unknown;
}

interface DigiflazzPascaResponse {
  data?: Partial<DigiflazzPascaResult> & Record<string, unknown>;
}

export interface PostpaidRequestParams {
  baseUrl: string;
  username: string;
  apiKey: string;
  buyerSkuCode: string;
  /** Untuk PBB dan SAMSAT ini sudah berupa gabungan berkoma. */
  customerNo: string;
  refId: string;
  /**
   * Hanya untuk akun mode development, sama seperti jalur prabayar. Akun
   * produksi tidak boleh pernah mengirimnya.
   */
  testing?: boolean;
}

/** Cek tagihan. PBB menerima `year`, E-Money pascabayar menerima `amount`. */
export interface InquiryParams extends PostpaidRequestParams {
  year?: string | number;
  amount?: string | number;
}

async function postPasca(
  commands: "inq-pasca" | "pay-pasca" | "status-pasca",
  params: InquiryParams,
  // Cek tagihan tidak menyentuh uang, jadi jawaban yang bentuknya aneh cukup
  // dianggap gagal. Untuk bayar dan cek status TIDAK: mengarang "Gagal" di
  // sana berarti melepas saldo mitra padahal keadaan sebenarnya belum
  // diketahui — lebih baik melempar galat dan membiarkan transaksinya
  // tertahan (dokumen terkunci §5f aturan 7).
  bolehDianggapGagal: boolean,
): Promise<DigiflazzPascaResult> {
  const sign = buildSignature(params.username, params.apiKey, params.refId);

  const response = await fetch(`${params.baseUrl.replace(/\/+$/, "")}/transaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commands,
      username: params.username,
      buyer_sku_code: params.buyerSkuCode,
      customer_no: params.customerNo,
      ref_id: params.refId,
      sign,
      ...(params.year !== undefined ? { year: String(params.year) } : {}),
      ...(params.amount !== undefined ? { amount: Number(params.amount) } : {}),
      ...(params.testing ? { testing: true } : {}),
    }),
  });

  const body = (await response.json().catch(() => null)) as DigiflazzPascaResponse | null;
  const data = body?.data;

  if (!data) {
    throw new Error(`Format respons Digiflazz tidak sesuai (HTTP ${response.status})`);
  }

  if (!data.status) {
    const pesan = typeof data.message === "string" ? data.message : `HTTP ${response.status}`;
    if (!bolehDianggapGagal) {
      throw new Error(`Respons Digiflazz tanpa status untuk ${commands}: ${pesan}`);
    }
    return {
      ref_id: String(data.ref_id ?? params.refId),
      customer_no: String(data.customer_no ?? params.customerNo),
      buyer_sku_code: String(data.buyer_sku_code ?? params.buyerSkuCode),
      message: pesan,
      status: "Gagal",
      rc: String(data.rc ?? "-"),
    };
  }

  return data as DigiflazzPascaResult;
}

// Menanyakan tagihan. Tidak ada uang yang bergerak di sini, dan ref_id yang
// dipakai di sini WAJIB dipakai ulang saat membayar.
export function inquirePostpaidBill(params: InquiryParams): Promise<DigiflazzPascaResult> {
  return postPasca("inq-pasca", params, true);
}

// Membayar tagihan yang sudah dicek, dengan ref_id yang sama. Hanya boleh
// dipanggil dari pembayaran pertama — mengirim ulang perintah ini BUKAN cek
// status, dan berisiko membayar tagihan dua kali (§5f aturan 3).
export function payPostpaidBill(params: PostpaidRequestParams): Promise<DigiflazzPascaResult> {
  return postPasca("pay-pasca", params, false);
}

// Menanyakan hasil pembayaran yang masih Pending. Inilah yang dipakai job
// rekonsiliasi dan tombol admin, bukan mengirim ulang pay-pasca.
export function checkPostpaidStatus(params: PostpaidRequestParams): Promise<DigiflazzPascaResult> {
  return postPasca("status-pasca", params, false);
}

// Digiflazz menjawab begini untuk cek status transaksi pascabayar yang sudah
// lewat 90 hari. Tapi jawaban yang sama sangat mungkin juga muncul kalau
// pay-pasca kita tidak pernah sampai ke mereka, dan dari sisi Digides kedua
// keadaan itu tidak bisa dibedakan. Karena itu jawaban ini TIDAK PERNAH
// dianggap Gagal: saldo tidak dilepas, transaksinya tetap tertahan dan
// ditangani manual (§5f aturan 7).
//
// Dicocokkan dari teks pesan karena rc-nya belum terdokumentasi; begitu rc
// resminya diketahui, pengecekan rc ditambahkan di sini.
export function isDataBelumAda(result: Pick<DigiflazzPascaResult, "message" | "rc">): boolean {
  return /data\s*belum\s*ada/i.test(result.message ?? "");
}
