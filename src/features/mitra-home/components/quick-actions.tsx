import Link from "next/link";
import { ArrowLeftRight, History, PiggyBank, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ACTIONS: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Isi Saldo", icon: Wallet },
  { label: "Transfer", icon: ArrowLeftRight },
  { label: "Tarik Dana", icon: PiggyBank },
  { label: "Histori", icon: History },
];

export interface QuickActionsProps {
  /** Action label -> its real route (e.g. "Histori" -> the role's
   *  /histori page). Everything else stays disabled until its own menu
   *  is built. */
  actionHrefs?: Record<string, string>;
}

// Every action is a real menu for this section (wallet top-up, transfer,
// withdrawal, transaction history) — actions without an entry in
// actionHrefs are shown disabled rather than linking anywhere, since that
// menu doesn't exist yet for BUMDes/Konter.
export function QuickActions({ actionHrefs = {} }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {ACTIONS.map(({ label, icon: Icon }) => {
        const href = actionHrefs[label];
        const content = (
          <>
            <Icon className="size-5" />
            <span className="text-xs font-medium">{label}</span>
          </>
        );

        if (href) {
          return (
            <Link
              key={label}
              href={href}
              className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center"
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            key={label}
            type="button"
            disabled
            title="Segera hadir"
            className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center text-muted-foreground/60"
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
