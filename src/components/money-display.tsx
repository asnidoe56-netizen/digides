import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/formatting/money";

const SIZE_STYLE = {
  sm: "text-sm",
  md: "text-base font-medium",
  lg: "text-2xl font-semibold",
} as const;

export interface MoneyDisplayProps {
  amount: string | number;
  size?: keyof typeof SIZE_STYLE;
  className?: string;
}

// The one place Rupiah amounts get rendered — every wallet balance,
// transaction price, and commission amount goes through this instead of
// interpolating formatMoney() directly, so a future format change (or a
// negative-amount / currency-code display rule) only needs to change here.
export function MoneyDisplay({ amount, size = "md", className }: MoneyDisplayProps) {
  return (
    <span className={cn("tabular-nums", SIZE_STYLE[size], className)}>
      {formatMoney(amount)}
    </span>
  );
}
