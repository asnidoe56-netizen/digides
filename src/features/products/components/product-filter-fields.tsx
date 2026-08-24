import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category } from "@/types/product";

export interface ProductFilterValues {
  category: string;
  status: string;
}

export const DEFAULT_PRODUCT_FILTER_VALUES: ProductFilterValues = { category: "ALL", status: "ALL" };

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua status" },
  { value: "ACTIVE", label: "Aktif" },
  { value: "GANGGUAN", label: "Gangguan" },
  { value: "DISABLED", label: "Nonaktif" },
];

export interface ProductFilterFieldsProps {
  categories: Category[];
  value: ProductFilterValues;
  onChange: (value: ProductFilterValues) => void;
}

// Just the controls — no dialog/sheet chrome, no apply/reset logic — so
// the same fields render identically inside a Dialog (tablet/desktop) or
// a Sheet (mobile) without duplicating the select markup in two places.
export function ProductFilterFields({ categories, value, onChange }: ProductFilterFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label>Kategori</Label>
        <Select value={value.category} onValueChange={(category) => onChange({ ...value, category })}>
          <SelectTrigger className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua kategori</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
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
    </div>
  );
}
