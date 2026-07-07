/**
 * Marten Background Worker
 *
 * Long-lived process that polls for pending investigations and ensures they
 * get processed. Designed to run on Render as a companion to the Next.js app.
 *
 * Processing model (at-least-once):
 *   1. Poll for investigations with status "pending" (or stale "running")
 *   2. Claim by setting status → "running" with heartbeat
 *   3. Delegate to orchestrator.resume() — processing happens via the
 *      in-process AsyncQueue (max 3 concurrent)
 *   4. On success: "complete"; on failure: "failed" (or "pending" if recoverable)
 *
 * Reliability properties:
 *   - Crashed workers leave investigations in "running" state
 *   - Worker reclaims stale "running" records after 2 min without heartbeat
 *   - Heartbeat is sent every 30s for all running investigations
 *   - Graceful shutdown on SIGTERM/SIGINT
 *
 * Coexistence with in-process async queue (next dev):
 *   - In local dev, the API route creates + enqueues via AsyncQueue immediately
 *   - Investigations spend milliseconds in "pending" state
 *   - Worker polls every 5s — it may pick up the same investigation (claim
 *     fails via optimistic lock, silently skipped)
 *   - Zero risk of duplicate processing
 */

import { investigationRepo } from "@/lib/repositories/investigation.repository";
import { orchestrator } from "@/lib/pipeline/orchestrator";
import { investigationQueue } from "@/lib/queue";
import { logger } from "@/lib/logger";

// ─── Configuration ────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS) || 5_000;
const BATCH_SIZE = Number(process.env.WORKER_BATCH_SIZE) || 5;
const STALE_RUNNING_TIMEOUT_MS = 120_000; // reclaim after 2 min without heartbeat

// ─── State ─────────────────────────────────────────────────────────────────

let running = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Start the background worker. Begins polling for pending investigations.
 *
 * Call once at process startup. Blocks the main thread while handling
 * graceful shutdown signals.
 */
export function startWorker(): void {
  if (running) {
    logger.warn("Worker is already running");
    return;
  }

  running = true;

  logger.info("Background worker started", {
    pollIntervalMs: POLL_INTERVAL_MS,
    batchSize: BATCH_SIZE,
    staleTimeoutMs: STALE_RUNNING_TIMEOUT_MS,
  });

  // Register graceful shutdown.
  for (const signal of ["SIGTERM", "SIGINT", "SIGQUIT"] as const) {
    process.once(signal, () => gracefulShutdown(signal));
  }

  // Periodic heartbeat for running investigations.
  setInterval(sendHeartbeats, 30_000);

  // Main poll loop.
  poll();
  pollTimer = setInterval(poll, POLL_INTERVAL_MS);
}

// ─── Internal ──────────────────────────────────────────────────────────────

async function poll(): Promise<void> {
  if (!running) return;

  try {
    const claimed = await claimWork();

    for (const id of claimed) {
      // Delegate to the orchestrator. It enqueues to the in-process
      // AsyncQueue which handles concurrency (max 3). The worker's job is
      // just to ensure the investigation gets into the queue.
      orchestrator.resume(id).catch((err) => {
        logger.error({ err, investigationId: id }, "Worker: orchestrator.resume failed");
      });
    }

    if (claimed.length > 0) {
      logger.info("Worker: claimed investigations, enqueued for processing", {
        claimed: claimed.length,
        queueDepth: investigationQueue.getStats().pending,
      });
    }
  } catch (err) {
    logger.error({ err }, "Worker poll cycle failed");
  }
}

/**
 * Claim pending and stale-running investigations using the repository.
 *
 * Uses optimistic locking: the repository handles the atomic claim logic.
 * If another worker or the async queue already claimed it, it's skipped silently.
 */
async function claimWork(): Promise<string[]> {
  return investigationRepo.claimBatch(BATCH_SIZE);
}

/**
 * Update heartbeat for all running investigations.
 * Prevents them from being reclaimed by another worker.
 */
async function sendHeartbeats(): Promise<void> {
  try {
    const count = await investigationRepo.sendHeartbeats();
    if (count > 0) {
      logger.debug("Heartbeats sent", { count });
    }
  } catch (err) {
    logger.error({ err }, "Heartbeat update failed");
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info("Worker received shutdown signal, stopping...", { signal });
  running = false;

  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  // Give active investigations up to 30s to finish.
  const queueStats = investigationQueue.getStats();
  if (queueStats.running > 0 || queueStats.pending > 0) {
    logger.info("Waiting for queue to drain...", queueStats);
    await new Promise((resolve) => setTimeout(resolve, 30_000));
  }

  logger.info("Worker stopped gracefully");
  process.exit(0);
}

// ─── Entry point ────────────────────────────────────────────────────────────
// When this file is executed directly (e.g. `npx tsx src/lib/worker.ts`),
// start the worker. When imported as a module, the caller must call
// startWorker() explicitly.
const isEntryPoint = process.argv[1]?.endsWith("worker.ts");
if (isEntryPoint) {
  startWorker();
}
