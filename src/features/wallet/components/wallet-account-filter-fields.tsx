import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface WalletAccountFilterValues {
  accountType: string;
  status: string;
  minBalance: string;
  maxBalance: string;
}

export const DEFAULT_WALLET_ACCOUNT_FILTER_VALUES: WalletAccountFilterValues = {
  accountType: "ALL",
  status: "ALL",
  minBalance: "",
  maxBalance: "",
};

const TYPE_OPTIONS = [
  { value: "ALL", label: "Semua tipe" },
  { value: "BUMDES", label: "BUMDes" },
  { value: "KONTER", label: "Konter" },
  { value: "USER", label: "Affiliate" },
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua status" },
  { value: "ACTIVE", label: "Aktif" },
  { value: "SUSPENDED", label: "Ditangguhkan" },
  { value: "CLOSED", label: "Ditutup" },
];

export interface WalletAccountFilterFieldsProps {
  value: WalletAccountFilterValues;
  onChange: (value: WalletAccountFilterValues) => void;
}

export function WalletAccountFilterFields({ value, onChange }: WalletAccountFilterFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label>Tipe Pemilik</Label>
        <Select value={value.accountType} onValueChange={(accountType) => onChange({ ...value, accountType })}>
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
        <Label>Status</Label>
        <Select value={value.status} onValueChange={(status) => onChange({ ...value, status })}>
          <SelectTrigger className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label>Saldo Min.</Label>
          <Input
            type="number"
            inputMode="numeric"
            className="h-11"
            value={value.minBalance}
            onChange={(event) => onChange({ ...value, minBalance: event.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label>Saldo Maks.</Label>
          <Input
            type="number"
            inputMode="numeric"
            className="h-11"
            value={value.maxBalance}
            onChange={(event) => onChange({ ...value, maxBalance: event.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
