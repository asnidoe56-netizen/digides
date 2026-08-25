import { ArrowLeftRight, History, PiggyBank, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ACTIONS: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Isi Saldo", icon: Wallet },
  { label: "Transfer", icon: ArrowLeftRight },
  { label: "Tarik Dana", icon: PiggyBank },
  { label: "Histori", icon: History },
];

// Every action is a real menu this section will get next (wallet top-up,
// transfer, withdrawal, transaction history) — shown disabled rather than
// linking anywhere, since none of those pages exist yet for BUMDes/Konter.
export function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {ACTIONS.map(({ label, icon: Icon }) => (
        <button
          key={label}
          type="button"
          disabled
          title="Segera hadir"
          className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center text-muted-foreground/60"
        >
          <Icon className="size-5" />
          <span className="text-xs font-medium">{label}</span>
        </button>
      ))}
    </div>
  );
}
