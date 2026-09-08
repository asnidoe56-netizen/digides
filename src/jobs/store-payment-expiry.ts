import { expireStalePaymentRequests } from "@/repositories/store-payment.repository";

// A store payment request is only valid for 5 minutes (PRD §6 rule 5), but
// that rule was previously enforced only when someone actually tried to
// pay — a QR that nobody ever scans would sit at MENUNGGU forever, and its
// order at PENDING forever, so "Riwayat transaksi toko" would fill up with
// rows that could never resolve. This sweeper closes them on a schedule
// instead of waiting for an attempt that may never come.
//
// The 2-minute cadence is deliberately shorter than the 5-minute TTL: a
// request is never stale for longer than one sweep past its expiry, so a
// cashier watching the screen sees it close on its own rather than
// lingering. Nothing financial happens here — every expiry is a guarded
// status transition on a request nobody has claimed (see
// expireStalePaymentRequests), so it can never race a payment in flight.
const SWEEP_INTERVAL_MS = 2 * 60 * 1000;

export interface StorePaymentExpirySummary {
  requests: number;
  orders: number;
}

// Exported on its own (not just via the interval) so it can be triggered
// directly — a one-off manual run, or a test.
export async function runStorePaymentExpiry(): Promise<StorePaymentExpirySummary> {
  return expireStalePaymentRequests();
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

// Idempotent — safe to call more than once (e.g. if instrumentation.ts's
// register() somehow runs twice); only the first call actually schedules
// anything.
export function startStorePaymentExpiryJob(): void {
  if (intervalHandle) return;

  intervalHandle = setInterval(() => {
    runStorePaymentExpiry()
      .then((summary) => {
        if (summary.requests > 0) {
          console.log(
            `[store-payment-expiry] expired requests=${summary.requests} orders=${summary.orders}`,
          );
        }
      })
      .catch((error) => {
        console.error("[store-payment-expiry] run failed:", error);
      });
  }, SWEEP_INTERVAL_MS);

  // Don't let this timer keep the Node process alive on its own (e.g.
  // during a script or test run that should be able to exit cleanly).
  intervalHandle.unref?.();

  console.log(`[store-payment-expiry] job started, interval ${SWEEP_INTERVAL_MS}ms`);
}
