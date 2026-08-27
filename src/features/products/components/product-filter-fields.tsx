import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CategoryBrandPair } from "@/repositories/product.repository";
import type { Brand, Category } from "@/types/product";

export interface ProductFilterValues {
  category: string;
  brand: string;
  status: string;
}

export const DEFAULT_PRODUCT_FILTER_VALUES: ProductFilterValues = { category: "ALL", brand: "ALL", status: "ALL" };

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua status" },
  { value: "ACTIVE", label: "Aktif" },
  { value: "GANGGUAN", label: "Gangguan" },
  { value: "DISABLED", label: "Nonaktif" },
];

export interface ProductFilterFieldsProps {
  categories: Category[];
  brands: Brand[];
  /** Which brand ids actually have products under which category — narrows
   *  the Provider dropdown once a category is picked (e.g. Pulsa ->
   *  TELKOMSEL/INDOSAT/... only, not every brand in the whole catalog). */
  categoryBrandPairs: CategoryBrandPair[];
  value: ProductFilterValues;
  onChange: (value: ProductFilterValues) => void;
}

// Just the controls — no dialog/sheet chrome, no apply/reset logic — so
// the same fields render identically inside a Dialog (tablet/desktop) or
// a Sheet (mobile) without duplicating the select markup in two places.
export function ProductFilterFields({
  categories,
  brands,
  categoryBrandPairs,
  value,
  onChange,
}: ProductFilterFieldsProps) {
  const visibleBrands =
    value.category === "ALL"
      ? brands
      : brands.filter((brand) =>
          categoryBrandPairs.some((pair) => pair.category_id === value.category && pair.brand_id === brand.id),
        );

  function handleCategoryChange(category: string) {
    // Switching category can invalidate the currently-selected provider
    // (e.g. Pulsa's TELKOMSEL id isn't necessarily meaningful once you
    // switch to PLN) — reset it rather than silently filtering on a
    // provider that no longer applies.
    onChange({ ...value, category, brand: "ALL" });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label>Kategori</Label>
        <Select value={value.category} onValueChange={handleCategoryChange}>
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
        <Label>Provider</Label>
        <Select value={value.brand} onValueChange={(brand) => onChange({ ...value, brand })}>
          <SelectTrigger className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua provider</SelectItem>
            {visibleBrands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
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
