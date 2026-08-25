import type { CustomerIdFieldConfig } from "./components/category-purchase-flow";

// For utility/token top-ups identified by a customer or meter ID rather
// than a phone number — PLN token, Pertagas, and pay-TV decoders all use
// this shape. Pages spread + override `label`/`placeholder` for their own
// wording (e.g. "No. Meter" for PLN/Gas vs "No. Kartu" for pay-TV) while
// keeping the same validation.
export const NUMERIC_ID_FIELD: CustomerIdFieldConfig = {
  label: "ID Pelanggan",
  placeholder: "Contoh: 1234567890",
  pattern: "^[0-9]{8,15}$",
  invalidMessage: "ID Pelanggan tidak valid.",
  helperMessage: "Isi ID Pelanggan yang valid untuk memilih provider.",
};
