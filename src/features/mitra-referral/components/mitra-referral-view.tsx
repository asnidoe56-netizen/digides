import type { DownlineWithMaskedBalance } from "@/services/referral.service";
import { DownlineList } from "./downline-list";
import { ReferralCodeCard } from "./referral-code-card";

export interface MitraReferralViewProps {
  fullName: string;
  roleLabel: string;
  referralCode: string;
  downlines: DownlineWithMaskedBalance[];
}

export function MitraReferralView({ fullName, roleLabel, referralCode, downlines }: MitraReferralViewProps) {
  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex flex-col gap-4 rounded-b-3xl bg-linear-to-br from-red-500 to-red-700 px-4 pt-4 pb-6 text-white sm:rounded-3xl">
        <div>
          <p className="text-xs text-white/80">Menu Mitra</p>
          <p className="font-semibold">
            {fullName} <span className="font-normal text-white/80">({roleLabel})</span>
          </p>
        </div>
        <ReferralCodeCard code={referralCode} />
      </div>

      <div className="flex flex-col gap-3 px-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Daftar Downline</h2>
          <span className="text-sm text-muted-foreground">{downlines.length} orang</span>
        </div>
        <DownlineList downlines={downlines} />
      </div>
    </div>
  );
}
