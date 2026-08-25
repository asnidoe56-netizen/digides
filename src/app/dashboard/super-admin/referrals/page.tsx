import { PageHeader } from "@/components/page-header";
import {
  ReferralCodeGenerateDialog,
  ReferralCodeList,
  ReferralRelationshipList,
  ReferralTabs,
  type ReferralTabKey,
} from "@/features/referral";
import { getReferralCodes, getReferralRelationships } from "@/services/referral.service";

// Codes/relationships change from admin actions on this same page — never
// statically cached, same reasoning as every other admin data page.
export const dynamic = "force-dynamic";

interface SuperAdminReferralsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

function isValidTab(value: string | undefined): value is ReferralTabKey {
  return value === "codes" || value === "relationships";
}

export default async function SuperAdminReferralsPage({ searchParams }: SuperAdminReferralsPageProps) {
  const params = await searchParams;
  const tab: ReferralTabKey = isValidTab(params.tab) ? params.tab : "codes";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Referral"
        description="Kelola kode referral dan relasi referrer-penerima yang menjadi dasar perhitungan komisi."
        actions={tab === "codes" ? <ReferralCodeGenerateDialog /> : undefined}
      />

      <ReferralTabs active={tab} />

      {tab === "codes" ? <CodesTab /> : null}
      {tab === "relationships" ? <RelationshipsTab /> : null}
    </div>
  );
}

async function CodesTab() {
  const codes = await getReferralCodes();
  return <ReferralCodeList codes={codes} />;
}

async function RelationshipsTab() {
  const relationships = await getReferralRelationships();
  return <ReferralRelationshipList relationships={relationships} />;
}
