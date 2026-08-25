import { listByStatus } from "@/repositories/transaction.repository";
import { checkTransactionStatus } from "@/services/transaction.service";

// Some Digiflazz products (DANA and other async-settled E-Money SKUs)
// answer the initial /transaction call with "Pending" even in production —
// the real Sukses/Gagal only becomes available on a later re-check with the
// same ref_id. Without this job, a transaction stays RESERVED (funds held,
// mitra sees "Diproses") until a Super Admin happens to open Transaksi
// Tertahan and clicks "Cek Status" by hand.
const CHECK_INTERVAL_MS = 3 * 60 * 1000;

// Caps how many stuck transactions one run resolves — listByStatus already
// orders oldest-first, so a backlog drains oldest-to-newest across runs
// rather than one run trying to walk an unbounded list.
const BATCH_SIZE = 50;

export interface PendingTransactionCheckSummary {
  checked: number;
  resolved: number;
  errors: number;
}

// Exported on its own (not just via the interval) so it can be triggered
// directly — e.g. a one-off manual run, or a test.
export async function runPendingTransactionCheck(): Promise<PendingTransactionCheckSummary> {
  const pending = await listByStatus("RESERVED", BATCH_SIZE);
  let resolved = 0;
  let errors = 0;

  for (const transaction of pending) {
    try {
      // actorUserId is null — this re-check was never initiated by a human,
      // so there's no admin to attribute the resulting DEBIT/RELEASE
      // ledger entry to.
      const result = await checkTransactionStatus(transaction.id, null);
      if (result.status !== "RESERVED") {
        resolved += 1;
      }
    } catch (error) {
      errors += 1;
      console.error(`[pending-transaction-check] failed for transaction ${transaction.id}:`, error);
    }
  }

  return { checked: pending.length, resolved, errors };
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

// Idempotent — safe to call more than once (e.g. if instrumentation.ts's
// register() somehow runs twice); only the first call actually schedules
// anything.
export function startPendingTransactionCheckJob(): void {
  if (intervalHandle) return;

  intervalHandle = setInterval(() => {
    runPendingTransactionCheck()
      .then((summary) => {
        if (summary.checked > 0) {
          console.log(
            `[pending-transaction-check] checked=${summary.checked} resolved=${summary.resolved} errors=${summary.errors}`,
          );
        }
      })
      .catch((error) => {
        console.error("[pending-transaction-check] run failed:", error);
      });
  }, CHECK_INTERVAL_MS);

  // Don't let this timer keep the Node process alive on its own (e.g.
  // during a script or test run that should be able to exit cleanly).
  intervalHandle.unref?.();

  console.log(`[pending-transaction-check] job started, interval ${CHECK_INTERVAL_MS}ms`);
}
