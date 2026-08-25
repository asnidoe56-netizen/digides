import { PageHeader } from "@/components/page-header";
import { SettingsTabs, type SettingsTabKey } from "@/features/settings";
import { DigiflazzSettingsForm } from "@/features/digiflazz";
import { MidtransSettingsForm } from "@/features/midtrans";
import { getDigiflazzSettingsForDisplay } from "@/services/digiflazz.service";
import { getMidtransSettingsForDisplay } from "@/services/midtrans.service";

// Reads live, never cached — credential state (is a key set? which mode is
// active?) must always reflect what's actually in the database.
export const dynamic = "force-dynamic";

interface SuperAdminSettingsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

function isValidTab(value: string | undefined): value is SettingsTabKey {
  return value === "digiflazz" || value === "midtrans";
}

export default async function SuperAdminSettingsPage({ searchParams }: SuperAdminSettingsPageProps) {
  const params = await searchParams;
  const tab: SettingsTabKey = isValidTab(params.tab) ? params.tab : "digiflazz";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pengaturan"
        description="Kredensial API pihak ketiga — cukup diisi di sini, tidak perlu mengubah kode."
      />

      <SettingsTabs active={tab} />

      {tab === "digiflazz" ? <DigiflazzTab /> : null}
      {tab === "midtrans" ? <MidtransTab /> : null}
    </div>
  );
}

async function DigiflazzTab() {
  const settings = await getDigiflazzSettingsForDisplay();

  return (
    <div className="flex flex-col gap-6">
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
          <li>
            (Opsional, untuk update status real-time) Payload URL di halaman Atur Koneksi → Webhook Digiflazz
            diarahkan ke{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-foreground">
              https://domain-anda/api/webhooks/digiflazz
            </code>
            , status Webhook diaktifkan, dan kolom Secret diisi nilai yang sama dengan Webhook Secret di form ini.
          </li>
        </ul>
      </div>
    </div>
  );
}

async function MidtransTab() {
  const settings = await getMidtransSettingsForDisplay();

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-lg text-sm text-muted-foreground">
        Mengaktifkan top up saldo mandiri: pengguna membayar lewat Midtrans, dan begitu pembayaran
        berhasil, saldo mereka otomatis bertambah lewat notifikasi webhook — tanpa perlu persetujuan
        admin manual.
      </p>

      <MidtransSettingsForm initialSettings={settings} />

      <div className="max-w-lg rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Sebelum menyimpan, pastikan di luar aplikasi ini:</p>
        <ul className="mt-2 list-disc pl-4">
          <li>
            Payment Notification URL di Dashboard Midtrans (Settings → Configuration) diarahkan ke{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-foreground">
              https://domain-anda/api/webhooks/midtrans
            </code>
            .
          </li>
          <li>URL notifikasi diatur terpisah untuk mode Sandbox dan Production di dashboard Midtrans.</li>
        </ul>
      </div>
    </div>
  );
}
