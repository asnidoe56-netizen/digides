// Runs once when a new Next.js server instance boots (dev server start, or
// `next start` in production) — the framework-native place for a
// self-hosted, always-on background job, since this app runs as a
// persistent Node process rather than serverless functions.
export async function register() {
  // Next.js calls register() once per runtime it instantiates (Node.js and,
  // separately, Edge if middleware uses it). Guard so the interval-based
  // job is only ever scheduled in the Node.js runtime, which is the only
  // one that can run `pg` queries and Digiflazz's `fetch` calls anyway.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPendingTransactionCheckJob } = await import("@/jobs/pending-transaction-check");
    startPendingTransactionCheckJob();
  }
}
