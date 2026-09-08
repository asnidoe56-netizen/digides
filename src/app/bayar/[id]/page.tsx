import { redirect } from "next/navigation";
import { BayarView } from "@/features/mitra-toko";
import { getSession } from "@/lib/auth/session";
import { homeRouteForRoles } from "@/lib/auth/home-route";
import { getStorePaymentDetail } from "@/services/store-payment.service";

// Deliberately outside every role's dashboard: the person paying at a
// warung is any Digides user with a balance — usually a plain AFFILIATE,
// who has no BUMDes/Konter shell at all. Scoping this page to one of those
// sections would have locked out exactly the people it exists for. It is
// still session-guarded; the payment request id in the QR is the
// capability, and confirming still needs the payer's own PIN.
export const dynamic = "force-dynamic";

export default async function BayarPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const detail = await getStorePaymentDetail(id).catch(() => null);
  const homeHref = homeRouteForRoles(session.roles);
  if (!detail) redirect(homeHref);

  return <BayarView detail={detail} homeHref={homeHref} />;
}
