import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface UserFilterValues {
  status: string;
  role: string;
}

export const DEFAULT_USER_FILTER_VALUES: UserFilterValues = { status: "ALL", role: "ALL" };

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua status" },
  { value: "ACTIVE", label: "Aktif" },
  { value: "SUSPENDED", label: "Ditangguhkan" },
  { value: "DELETED", label: "Dihapus" },
];

const ROLE_OPTIONS = [
  { value: "ALL", label: "Semua role" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "BUMDES_ADMIN", label: "BUMDes Admin" },
  { value: "KONTER", label: "Konter" },
  { value: "AFFILIATE", label: "Affiliate" },
];

export interface UserFilterFieldsProps {
  value: UserFilterValues;
  onChange: (value: UserFilterValues) => void;
}

export function UserFilterFields({ value, onChange }: UserFilterFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
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

      <div className="grid gap-2">
        <Label>Role</Label>
        <Select value={value.role} onValueChange={(role) => onChange({ ...value, role })}>
          <SelectTrigger className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
