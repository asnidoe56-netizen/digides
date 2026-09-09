import { pool } from "@/lib/db/pool";

// Ekspor data usaha sebagai JSON, untuk Super Admin.
//
// APA INI, DAN APA YANG BUKAN. Ini salinan CATATAN usaha — transaksi,
// ledger, pesanan toko, komisi — dalam bentuk yang bisa dibuka siapa pun
// dengan alat biasa dan disimpan di luar server. Ini BUKAN cadangan
// pemulihan: memulihkan Digides dari berkas ini berarti menyusun ulang
// skema, urutan foreign key, trigger, dan indeks dengan tangan.
//
// Cadangan pemulihan yang sebenarnya adalah `pg_dump` harian dari
// scripts/backup.ts. Keduanya saling melengkapi dan tidak saling
// menggantikan, dan halaman yang memanggil fungsi ini harus mengatakan itu
// apa adanya — cadangan yang dikira lengkap padahal tidak adalah cara
// paling pasti kehilangan data pada hari yang paling buruk.

/** Tabel yang ikut, beserta urutan bacanya. */
const EXPORTED_TABLES = [
  // Identitas dan hak akses
  "roles",
  "user_roles",
  // Struktur usaha
  "bumdes",
  "konters",
  "stores",
  // Uang — bagian yang paling tidak tergantikan
  "wallet_accounts",
  "wallets",
  "wallet_ledger",
  "wallet_transfers",
  "transactions",
  "transaction_events",
  "payments",
  // Digides Toko
  "store_product_categories",
  "store_products",
  "store_orders",
  "store_order_items",
  "store_payment_requests",
  "store_inventory_events",
  "store_settlements",
  // Komisi & jaringan
  "commission_rules",
  "commission_settings",
  "commission_ledger",
  "commission_payouts",
  "referral_codes",
  "referral_relationships",
  // Katalog & harga
  "products",
  "categories",
  "brands",
  "markup_rules",
  // Operasional
  "manual_payment_methods",
  "reconciliation_records",
  "mitra_complaints",
  "audit_logs",
  "security_incidents",
  "security_policies",
  "schema_migrations",
] as const;

// Yang SENGAJA tidak ikut, dan alasannya. Ditulis di sini supaya orang
// berikutnya tidak menambahkannya "supaya lengkap".
//
// - user_transaction_pins, users.password_hash — kredensial. Berkas ini
//   diunduh ke laptop, dikirim lewat WhatsApp, dan disimpan di folder
//   yang tidak pernah dibersihkan. Hash password dan PIN tidak boleh ikut
//   ke perjalanan itu.
// - user_sessions, user_biometric_credentials,
//   user_mobile_biometric_credentials, webauthn_challenges — kunci sesi
//   dan kredensial perangkat yang masih hidup.
// - digiflazz_settings, midtrans_settings — kunci API penyedia. Bocornya
//   satu berkas ini berarti orang lain bisa berbelanja atas nama Digides.
// - wilayah — data acuan statis puluhan ribu baris yang bisa dimuat ulang
//   kapan saja; ikut hanya akan membuat berkasnya besar tanpa menambah
//   apa pun yang tidak bisa didapat lagi.
// - login_activities, notifications — riwayat operasional bervolume
//   tinggi yang tidak menyimpan nilai usaha.

export interface BackupExport {
  generated_at: string;
  /** Peringatan yang ikut ke dalam berkasnya sendiri, bukan hanya di layar
   *  — berkas ini akan dibuka berbulan-bulan kemudian oleh orang yang
   *  tidak membaca halaman yang mengunduhnya. */
  catatan: string;
  tables: Record<string, unknown[]>;
  row_counts: Record<string, number>;
}

export async function buildBackupExport(): Promise<BackupExport> {
  const tables: Record<string, unknown[]> = {};
  const rowCounts: Record<string, number> = {};

  for (const table of EXPORTED_TABLES) {
    // Nama tabel berasal dari daftar konstan di atas, tidak pernah dari
    // masukan pengguna — itulah yang membuat interpolasi di sini aman,
    // dan kenapa daftarnya harus tetap konstan. `users` sengaja tidak ada
    // di daftar itu; ia dibaca terpisah di bawah dengan kolom yang
    // disebutkan satu per satu.
    try {
      const result = await pool.query(`SELECT * FROM ${table}`);
      tables[table] = result.rows;
      rowCounts[table] = result.rowCount ?? 0;
    } catch {
      // Tabel yang belum ada di lingkungan ini (mis. dev yang tertinggal
      // migrasinya) dilewati, bukan menggagalkan seluruh ekspor. Ekspor
      // sebagian yang jujur mengatakan bagiannya lebih berguna daripada
      // ekspor yang menolak jalan.
      rowCounts[table] = -1;
    }
  }

  // users ditangani terpisah supaya password_hash benar-benar tidak
  // pernah masuk ke hasil — bukan disaring belakangan, melainkan tidak
  // pernah ikut terbaca.
  const users = await pool.query(
    `SELECT id, email, phone, full_name, status, locked_until, max_active_devices,
            must_change_password, terms_accepted_at, terms_version,
            province_code, regency_code, district_code, village_code,
            registration_latitude, registration_longitude, created_at, updated_at
     FROM users ORDER BY created_at`,
  );
  tables.users = users.rows;
  rowCounts.users = users.rowCount ?? 0;

  return {
    generated_at: new Date().toISOString(),
    catatan:
      "Salinan catatan usaha Digides. BUKAN cadangan pemulihan — untuk memulihkan " +
      "sistem, pakai berkas pg_dump harian di server. Password, PIN transaksi, " +
      "kunci sesi, dan kunci API penyedia sengaja tidak disertakan.",
    tables,
    row_counts: rowCounts,
  };
}

export interface BackupSummary {
  table: string;
  rows: number;
}

/** Ringkasan jumlah baris, untuk ditampilkan sebelum orang mengunduh —
 *  supaya mereka tahu apa yang akan mereka dapat, bukan menebak dari
 *  ukuran berkas. */
export async function getBackupSummary(): Promise<BackupSummary[]> {
  const summary: BackupSummary[] = [];
  for (const table of [...EXPORTED_TABLES, "users"]) {
    try {
      const result = await pool.query<{ count: string }>(`SELECT COUNT(*) FROM ${table}`);
      summary.push({ table, rows: Number(result.rows[0].count) });
    } catch {
      summary.push({ table, rows: -1 });
    }
  }
  return summary.sort((a, b) => b.rows - a.rows);
}
