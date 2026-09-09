import { AlertTriangle, Database, HardDriveDownload } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BackupDownloadButton } from "@/features/backup";
import { getBackupSummary } from "@/services/backup.service";

// Selalu segar: jumlah barisnya adalah alasan halaman ini ada, dan angka
// yang di-cache akan membuat orang mengunduh sambil mengira tahu isinya.
export const dynamic = "force-dynamic";

export default async function BackupPage() {
  const summary = await getBackupSummary();
  const totalRows = summary.reduce((sum, row) => sum + Math.max(row.rows, 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cadangan Data"
        description="Salinan catatan usaha Digides, untuk disimpan di luar server."
      />

      {/* Dibaca sebelum tombolnya, dan sengaja tidak dihaluskan. Cadangan
          yang dikira lengkap padahal bukan adalah cara paling pasti
          kehilangan data pada hari yang paling buruk. */}
      <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="text-sm">
          <p className="font-medium">Ini bukan cadangan pemulihan sistem.</p>
          <p className="mt-1 text-muted-foreground">
            Berkas JSON di bawah adalah salinan <strong>catatan</strong> — berguna untuk
            diperiksa, diarsipkan, dan dibuka dengan alat biasa. Memulihkan Digides dari
            berkas ini berarti menyusun ulang skema, urutan relasi, dan trigger dengan
            tangan.
          </p>
          <p className="mt-2 text-muted-foreground">
            Pemulihan yang sebenarnya memakai berkas <code className="rounded bg-muted px-1 py-0.5 text-xs">pg_dump</code>{" "}
            harian di server (<code className="rounded bg-muted px-1 py-0.5 text-xs">/home/digides/backups</code>).
            Keduanya saling melengkapi, bukan saling menggantikan.
          </p>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <HardDriveDownload className="size-4" />
              Unduh salinan catatan (JSON)
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {totalRows.toLocaleString("id-ID")} baris dari {summary.length} tabel.
            </p>
          </div>
          <BackupDownloadButton />
        </div>

        <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Yang sengaja tidak disertakan</p>
          <p className="mt-1">
            Password, PIN transaksi, kunci sesi, kredensial biometrik, dan kunci API
            penyedia. Berkas ini akan diunduh ke laptop, dikirim lewat pesan, dan disimpan
            di folder yang tidak pernah dibersihkan — kredensial tidak boleh ikut ke
            perjalanan itu.
          </p>
          <p className="mt-2">
            Data wilayah juga tidak ikut: puluhan ribu baris acuan statis yang bisa dimuat
            ulang kapan saja.
          </p>
          <p className="mt-2">
            Setiap pengunduhan tercatat di <strong>Audit Log</strong>.
          </p>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Database className="size-4" />
          <p className="text-sm font-medium">Isi salinan</p>
        </div>
        <div className="divide-y">
          {summary.map((row) => (
            <div key={row.table} className="flex items-center justify-between px-4 py-2 text-sm">
              <code className="text-xs text-muted-foreground">{row.table}</code>
              <span className="tabular-nums">
                {row.rows < 0 ? (
                  <span className="text-muted-foreground">tidak ada</span>
                ) : (
                  row.rows.toLocaleString("id-ID")
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
