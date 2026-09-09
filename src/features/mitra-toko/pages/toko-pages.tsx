import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listStoreOrdersByStore } from "@/repositories/store-order.repository";
import { listStoreSettlements } from "@/repositories/store.repository";
import { getMyStore, getWalletForStore } from "@/services/store.service";
import { listMyStoreProducts } from "@/services/store-product.service";
import {
  getStoreOrderDetail,
  listMyStoreOrders,
} from "@/services/store-payment.service";
import { KasirView } from "../components/kasir-view";
import { ProdukView } from "../components/produk-view";
import { RiwayatView } from "../components/riwayat-view";
import { StrukView } from "../components/struk-view";
import { TokoView } from "../components/toko-view";

// One implementation per screen, shared by both mitra sections — the
// BUMDes and Konter routes are thin wrappers that differ only in their
// basePath/homeHref, the same convention the Laporan pages already
// established for "same screen, two role prefixes".
export interface TokoRouteProps {
  /** e.g. "/dashboard/bumdes/toko" */
  basePath: string;
  /** e.g. "/dashboard/bumdes/dashboard" */
  homeHref: string;
}

const RECENT_ORDER_LIMIT = 5;

export async function TokoHomePage({ basePath, homeHref }: TokoRouteProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await getMyStore(session.userId);
  const [wallet, recentOrders, recentSettlements] = await Promise.all([
    store ? getWalletForStore(store.id) : Promise.resolve(null),
    store ? listStoreOrdersByStore(store.id, { limit: RECENT_ORDER_LIMIT }) : Promise.resolve([]),
    store ? listStoreSettlements(store.id, RECENT_ORDER_LIMIT) : Promise.resolve([]),
  ]);

  return (
    <TokoView
      store={store}
      wallet={wallet}
      recentOrders={recentOrders}
      recentSettlements={recentSettlements}
      basePath={basePath}
      homeHref={homeHref}
    />
  );
}

export async function TokoKasirPage({ basePath }: TokoRouteProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await getMyStore(session.userId);
  // Both redirects land on the Toko home, which is the one screen that
  // knows how to explain each state (belum punya toko / menunggu
  // verifikasi) properly.
  if (!store || store.status !== "ACTIVE") redirect(basePath);

  const products = await listMyStoreProducts(session.userId);

  return <KasirView storeName={store.name} products={products} basePath={basePath} />;
}

export async function TokoProdukPage({ basePath }: TokoRouteProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await getMyStore(session.userId);
  if (!store) redirect(basePath);

  const products = await listMyStoreProducts(session.userId);

  return <ProdukView products={products} basePath={basePath} />;
}

export async function TokoRiwayatPage({ basePath }: TokoRouteProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await getMyStore(session.userId);
  if (!store) redirect(basePath);

  const { orders } = await listMyStoreOrders(session.userId, { limit: 50 });

  return <RiwayatView orders={orders} basePath={basePath} />;
}

export async function TokoStrukPage({ basePath, orderId }: TokoRouteProps & { orderId: string }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // getStoreOrderDetail itself enforces that the viewer is either the
  // store's owner or the buyer who paid — this page never widens that.
  const detail = await getStoreOrderDetail(orderId, session.userId).catch(() => null);
  if (!detail) redirect(`${basePath}/riwayat`);

  return <StrukView detail={detail} basePath={basePath} />;
}

// There is deliberately no buyer-facing page here: paying at a warung is
// something any Digides user does, including plain AFFILIATEs who have no
// BUMDes/Konter shell, so that screen lives at the role-neutral
// /bayar/[id] route instead of inside either section.
