import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { recordAuditLog } from "@/repositories/audit.repository";
import { buildBackupExport } from "@/services/backup.service";

// Unduhan salinan catatan usaha, untuk Super Admin.
//
// Setiap pengunduhan dicatat di audit log. Berkas ini memuat seluruh
// riwayat keuangan platform dalam satu file yang bisa dibawa ke mana
// saja — siapa yang mengambilnya dan kapan adalah hal yang harus bisa
// dijawab, bukan ditebak.
//
// Tidak ada parameter apa pun di sini: tidak ada pilihan tabel, tidak ada
// rentang tanggal, tidak ada nama berkas dari klien. Endpoint yang
// menerima nama tabel dari luar akan menjadi cara membaca tabel yang
// sengaja dikecualikan.
export async function GET() {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  try {
    const data = await buildBackupExport();

    await recordAuditLog({
      actor_user_id: session.userId,
      action: "DATA_EXPORT_DOWNLOADED",
      entity: "system",
      // Tidak ada satu baris pun yang diekspor ini — yang dicatat adalah
      // peristiwanya, dan cap waktunya yang menjadi penandanya.
      entity_id: session.userId,
      new_value: { row_counts: data.row_counts },
    });

    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "");
    const body = JSON.stringify(data, null, 2);

    return new NextResponse(body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="digides_data_${stamp}.json"`,
        // Salinan basi lebih buruk daripada tidak ada salinan: berkas ini
        // dinilai orang dari tanggalnya, dan proxy yang menyimpannya akan
        // memberi tanggal yang salah.
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyiapkan ekspor." },
      { status: 500 },
    );
  }
}
