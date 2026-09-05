import { PageHeader } from "@/components/page-header";
import { SettingsTabs, type SettingsTabKey } from "@/features/settings";
import { DigiflazzSettingsForm, ServerIpCard } from "@/features/digiflazz";
import { MidtransSettingsForm } from "@/features/midtrans";
import { ManualPaymentMethodList } from "@/features/manual-payment-methods";
import { SupportSettingsForm } from "@/features/support-settings";
import { getDigiflazzSettingsForDisplay } from "@/services/digiflazz.service";
import { getMidtransSettingsForDisplay } from "@/services/midtrans.service";
import { getServerPublicIp } from "@/services/network-info.service";
import { getSupportSettings } from "@/repositories/support-settings.repository";
import { getManualPaymentMethods } from "@/services/manual-payment-method.service";

// Reads live, never cached — credential state (is a key set? which mode is
// active?) must always reflect what's actually in the database.
export const dynamic = "force-dynamic";

interface SuperAdminSettingsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

function isValidTab(value: string | undefined): value is SettingsTabKey {
  return value === "digiflazz" || value === "midtrans" || value === "manual-topup" || value === "support";
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
      {tab === "manual-topup" ? <ManualTopupTab /> : null}
      {tab === "support" ? <SupportTab /> : null}
    </div>
  );
}

// support_settings.whatsapp_number is stored international ("6281...") so
// every reader can build a wa.me link with no normalization of its own —
// converted back to the locally-familiar "08xx" shape only here, for the
// form field an admin actually looks at and edits.
function toLocalFormat(internationalNumber: string): string {
  return internationalNumber.startsWith("62") ? `0${internationalNumber.slice(2)}` : internationalNumber;
}

async function ManualTopupTab() {
  const methods = await getManualPaymentMethods();

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-lg text-sm text-muted-foreground">
        Belum ada payment gateway aktif — Mitra yang mengisi saldo lewat aplikasi ditawari hanya metode
        yang berstatus Aktif di bawah ini, transfer manual ke nomor yang tertera, lalu menekan
        &quot;Saya Sudah Membayar&quot; sambil menunggu diverifikasi tim DigiDes di menu Wallet.
      </p>

      <ManualPaymentMethodList methods={methods} />
    </div>
  );
}

async function SupportTab() {
  const settings = await getSupportSettings();

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-lg text-sm text-muted-foreground">
        Nomor WhatsApp yang dibuka saat pengguna menekan ikon tanda tanya di Beranda aplikasi Mitra —
        ganti di sini kapan saja, tidak perlu rilis aplikasi baru.
      </p>

      <SupportSettingsForm initialWhatsappNumber={toLocalFormat(settings.whatsapp_number)} />
    </div>
  );
}

async function DigiflazzTab() {
  const [settings, serverIp] = await Promise.all([getDigiflazzSettingsForDisplay(), getServerPublicIp()]);

  return (
    <div className="flex flex-col gap-6">
      <ServerIpCard ip={serverIp} />

      <DigiflazzSettingsForm initialSettings={settings} />

      <div className="max-w-lg rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Sebelum menyimpan, pastikan di luar aplikasi ini:</p>
        <ul className="mt-2 list-disc pl-4">
          <li>
            IP server DigiDes (lihat kotak di atas) sudah di-whitelist di laman Pengaturan Koneksi API
            Digiflazz — terpisah untuk development dan production.
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
