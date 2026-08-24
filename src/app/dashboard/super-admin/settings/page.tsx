import { PageHeader } from "@/components/page-header";
import { DigiflazzSettingsForm } from "@/features/digiflazz";
import { getDigiflazzSettingsForDisplay } from "@/services/digiflazz.service";

// Reads live, never cached — credential state (is a key set? which mode is
// active?) must always reflect what's actually in the database.
export const dynamic = "force-dynamic";

export default async function SuperAdminSettingsPage() {
  const settings = await getDigiflazzSettingsForDisplay();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pengaturan"
        description="Kredensial API Digiflazz — cukup diisi di sini, tidak perlu mengubah kode."
      />

      <DigiflazzSettingsForm initialSettings={settings} />

      <div className="max-w-lg rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Sebelum menyimpan, pastikan di luar aplikasi ini:</p>
        <ul className="mt-2 list-disc pl-4">
          <li>
            IP server DigiDes sudah di-whitelist di laman Pengaturan Koneksi API Digiflazz — terpisah
            untuk development dan production.
          </li>
          <li>
            IP Digiflazz <code className="rounded bg-muted px-1 py-0.5 text-foreground">52.74.250.133</code>{" "}
            sudah di-whitelist di firewall/server DigiDes.
          </li>
        </ul>
      </div>
    </div>
  );
}
