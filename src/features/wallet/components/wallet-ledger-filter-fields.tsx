import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface WalletLedgerFilterValues {
  type: string;
  channel: string;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_WALLET_LEDGER_FILTER_VALUES: WalletLedgerFilterValues = {
  type: "ALL",
  channel: "ALL",
  dateFrom: "",
  dateTo: "",
};

const TYPE_OPTIONS = [
  { value: "ALL", label: "Semua jenis" },
  { value: "TOPUP", label: "Top Up" },
  { value: "DEBIT", label: "Transaksi (Debit)" },
  { value: "RESERVE", label: "Reserve" },
  { value: "RELEASE", label: "Release" },
  { value: "REFUND", label: "Refund" },
  { value: "COMMISSION", label: "Komisi" },
  { value: "PAYOUT", label: "Payout" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

const CHANNEL_OPTIONS = [
  { value: "ALL", label: "Semua channel" },
  { value: "WEB", label: "Web" },
  { value: "TELEGRAM", label: "Telegram" },
  { value: "ADMIN", label: "Admin" },
  { value: "SYSTEM", label: "System" },
];

export interface WalletLedgerFilterFieldsProps {
  value: WalletLedgerFilterValues;
  onChange: (value: WalletLedgerFilterValues) => void;
}

export function WalletLedgerFilterFields({ value, onChange }: WalletLedgerFilterFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label>Jenis Mutasi</Label>
        <Select value={value.type} onValueChange={(type) => onChange({ ...value, type })}>
          <SelectTrigger className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Channel</Label>
        <Select value={value.channel} onValueChange={(channel) => onChange({ ...value, channel })}>
          <SelectTrigger className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHANNEL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label>Dari Tanggal</Label>
          <Input
            type="date"
            className="h-11"
            value={value.dateFrom}
            onChange={(event) => onChange({ ...value, dateFrom: event.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label>Sampai Tanggal</Label>
          <Input
            type="date"
            className="h-11"
            value={value.dateTo}
            onChange={(event) => onChange({ ...value, dateTo: event.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
