import { apiFetch } from "@/lib/api/client";
import type { Store } from "@/types/store";
import type { StoreOrder, StoreOrderItem, StorePaymentRequest } from "@/types/store-order";
import type { StoreInventoryEvent, StoreProduct } from "@/types/store-product";
import type { Wallet, WalletLedgerEntry } from "@/types/wallet";

// --- toko ---------------------------------------------------------------

export interface MyStoreResponse {
  store: Store | null;
  wallet: Wallet | null;
}

export function getMyStore() {
  return apiFetch<MyStoreResponse>("/api/stores/me");
}

export interface RegisterStoreInput {
  name: string;
  provinceCode?: string;
  regencyCode?: string;
  districtCode?: string;
  villageCode?: string;
  addressDetail?: string;
}

export function registerStore(input: RegisterStoreInput) {
  return apiFetch<{ store: Store; wallet: Wallet }>("/api/stores", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// --- produk -------------------------------------------------------------

export function listMyStoreProducts() {
  return apiFetch<{ products: StoreProduct[] }>("/api/store-products");
}

export function createStoreProduct(input: { name: string; price: number; stock: number }) {
  return apiFetch<{ product: StoreProduct }>("/api/store-products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateStoreProduct(
  id: string,
  input: { name?: string; price?: number; isActive?: boolean },
) {
  return apiFetch<{ product: StoreProduct }>(`/api/store-products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Signed — positive restocks, negative corrects shrinkage. */
export function adjustStoreProductStock(id: string, delta: number) {
  return apiFetch<{ product: StoreProduct }>(`/api/store-products/${id}/stock`, {
    method: "POST",
    body: JSON.stringify({ delta }),
  });
}

// --- kasir / pesanan ----------------------------------------------------

export interface CreateStoreOrderResponse {
  store: Store;
  order: StoreOrder;
  items: StoreOrderItem[];
  paymentRequest: StorePaymentRequest;
  /** Exactly the string to render as a QR — never rebuilt client-side. */
  qrPayload: string;
}

export function createStoreOrder(items: Array<{ storeProductId: string; quantity: number }>) {
  return apiFetch<CreateStoreOrderResponse>("/api/store-orders", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export function listMyStoreOrders(params: { status?: string; page?: number; limit?: number } = {}) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  return apiFetch<{ orders: StoreOrder[]; total: number; page: number; limit: number }>(
    `/api/store-orders${query ? `?${query}` : ""}`,
  );
}

export interface StoreOrderDetailResponse {
  store: { id: string; name: string };
  order: StoreOrder;
  items: StoreOrderItem[];
  paymentRequests: StorePaymentRequest[];
  ledgerEntries: WalletLedgerEntry[];
  inventoryEvents: StoreInventoryEvent[];
}

export function getStoreOrderDetail(orderId: string) {
  return apiFetch<StoreOrderDetailResponse>(`/api/store-orders/${orderId}`);
}

// --- pembayaran (sisi pembeli) ------------------------------------------

export interface StorePaymentDetailResponse {
  store: { id: string; name: string };
  order: StoreOrder;
  items: StoreOrderItem[];
  paymentRequest: StorePaymentRequest;
}

export function getStorePaymentDetail(paymentRequestId: string) {
  return apiFetch<StorePaymentDetailResponse>(`/api/store-payments/${paymentRequestId}`);
}

export function confirmStorePayment(paymentRequestId: string, pin: string) {
  return apiFetch<{ order: StoreOrder; items: StoreOrderItem[]; paymentRequest: StorePaymentRequest }>(
    `/api/store-payments/${paymentRequestId}/confirm`,
    { method: "POST", body: JSON.stringify({ pin }) },
  );
}
