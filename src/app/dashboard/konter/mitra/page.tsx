import { redirect } from "next/navigation";
import { MitraReferralView } from "@/features/mitra-referral";
import { getSession } from "@/lib/auth/session";
import { getMitraOverview } from "@/services/referral.service";
import { findUserById } from "@/repositories/user.repository";

// Downline balances change with every transaction — never statically
// prerendered.
export const dynamic = "force-dynamic";

export default async function KonterMitraPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, overview] = await Promise.all([findUserById(session.userId), getMitraOverview(session.userId)]);

  return (
    <MitraReferralView
      fullName={user?.full_name ?? ""}
      roleLabel="Agen"
      referralCode={overview.referralCode.code}
      downlines={overview.downlines}
    />
  );
}
