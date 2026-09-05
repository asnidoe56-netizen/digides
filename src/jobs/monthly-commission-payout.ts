import { getCommissionSettings, runMonthlyCommissionPayout } from "@/services/commission.service";
import { markCommissionAutoRunMonth } from "@/repositories/commission.repository";

// Checked once a day (not once a month) so the job can't miss its window —
// a server restart or a brief outage right on payout_day_of_month would
// otherwise skip that month entirely with a literal once-a-month timer.
// last_auto_run_month is what actually prevents running twice in the same
// month, not the check interval.
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Exported on its own (not just via the interval) so it can be triggered
// directly — e.g. a one-off manual run, or a test.
export async function checkAndRunMonthlyCommissionPayout(): Promise<void> {
  const settings = await getCommissionSettings();
  if (!settings.auto_payout_enabled) return;

  const now = new Date();
  if (now.getDate() < settings.payout_day_of_month) return;

  const thisMonth = currentYearMonth();
  if (settings.last_auto_run_month === thisMonth) return;

  const summary = await runMonthlyCommissionPayout(null);
  await markCommissionAutoRunMonth(settings.id, thisMonth);

  console.log(
    `[monthly-commission-payout] settled=${summary.settledCount} paidBeneficiaries=${summary.paidBeneficiaryCount} totalPaidAmount=${summary.totalPaidAmount} errors=${summary.errors}`,
  );
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

// Idempotent — safe to call more than once (e.g. if instrumentation.ts's
// register() somehow runs twice); only the first call actually schedules
// anything.
export function startMonthlyCommissionPayoutJob(): void {
  if (intervalHandle) return;

  intervalHandle = setInterval(() => {
    checkAndRunMonthlyCommissionPayout().catch((error) => {
      console.error("[monthly-commission-payout] run failed:", error);
    });
  }, CHECK_INTERVAL_MS);

  // Don't let this timer keep the Node process alive on its own (e.g.
  // during a script or test run that should be able to exit cleanly).
  intervalHandle.unref?.();

  console.log(`[monthly-commission-payout] job started, interval ${CHECK_INTERVAL_MS}ms`);
}
