-- Persists the verified account-holder name (E-Money's "Verifikasi
-- Pengguna" / Games' "Cek Username" lookup, verification.service.ts's
-- verifyCustomerName) onto the actual purchase it was checked for —
-- previously this was purely transient client-side state (Flutter's
-- PurchaseViewModel.verifiedName / web's category-purchase-flow.tsx's
-- verifiedName), discarded the moment the purchase completed. Nullable
-- and never required: most categories (PLN, Pulsa, Data, ...) have no
-- verification step at all, and even E-Money/Games purchases where the
-- mitra skipped "Verifikasi Pengguna" simply leave this null.
ALTER TABLE transactions ADD COLUMN customer_name text;
