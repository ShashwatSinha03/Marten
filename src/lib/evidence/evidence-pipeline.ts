import { investigationRepo } from "@/lib/repositories/investigation.repository";
import { emitter } from "@/lib/sse/emitter";
import { logger } from "@/lib/logger";
import { investigationQueue } from "@/lib/queue";
import { EnhancedEvidenceCollector } from "./evidence-collector";
import { validateInvestigationUrl } from "./url-validator";
import { emitPhaseChange, emitProgress, emitComplete, emitError } from "./sse-helpers";
import type { EvidencePipelinePhase } from "./types";

// Fixed placeholder user ID for the public no-auth endpoint.
const SYSTEM_USER_ID = "000000000000000000000000";

/**
 * EvidencePipeline — lightweight orchestrator for URL → evidence collection.
 *
 * Gracefully handles MongoDB being unavailable: falls back to UUID-based
 * investigation IDs with best-effort persistence. All SSE events remain
 * fully functional regardless of DB state.
 *
 * State flow:
 *   pending → url_validating → collecting_evidence → complete
 *   any → failed (on error)
 */
export class EvidencePipeline {
  private collector = new EnhancedEvidenceCollector();

  /**
   * Start an evidence collection investigation.
   *
   * Attempts to persist the investigation to MongoDB. If unavailable,
   * generates a UUID-based ID and proceeds without persistence.
   * SSE streaming and evidence collection still work in either case.
   */
  async start(
    url: string,
    depth: "quick" | "standard",
  ): Promise<{ investigationId: string }> {
    let investigationId: string;

    try {
      const investigation = await investigationRepo.create({
        url,
        normalizedUrl: url,
        depth,
        status: "pending" as const,
        progress: 0,
        userId: SYSTEM_USER_ID,
      });
      investigationId = investigation._id.toString();
    } catch {
      // MongoDB unavailable — fall back to UUID-based ID.
      // Persistence operations will be best-effort (caught by .catch(() => {})).
      investigationId = crypto.randomUUID();
      logger.warn("MongoDB unavailable — running without persistence", { investigationId, url });
    }

    // Enqueue the pipeline as a background job.
    investigationQueue
      .enqueue(() => this.#runPipeline(investigationId, url, depth))
      .catch((err: unknown) => {
        logger.error({ err, investigationId }, "Evidence pipeline background job failed");
      });

    logger.info("Evidence pipeline started", { investigationId, url, depth });

    return { investigationId };
  }

  async #runPipeline(
    investigationId: string,
    url: string,
    depth: "quick" | "standard",
  ): Promise<void> {
    try {
      // ── Step 1: URL validation ──
      await this.#transition(investigationId, "url_validating", 0);

      const validationResult = await validateInvestigationUrl(url);

      if (!validationResult.reachable || validationResult.error) {
        const error = validationResult.error ?? {
          code: "URL_UNREACHABLE",
          message: "The URL could not be reached.",
          recoverable: false,
        };

        await investigationRepo
          .updateStatus(investigationId, {
            status: "failed",
            progress: 0,
            error: error.message,
            errorCode: error.code,
          })
          .catch(() => {});

        emitError(investigationId, error.message, error.code);
        emitPhaseChange(investigationId, "failed", 0);

        logger.warn("URL validation failed", { investigationId, url, error });
        return;
      }

      const normalizedUrl = validationResult.normalizedUrl;

      // ── Step 2: Collecting evidence ──
      await this.#transition(investigationId, "collecting_evidence", 0.1);

      emitProgress(
        investigationId,
        0.15,
        "collecting_evidence",
        `Navigating to ${new URL(normalizedUrl).hostname}...`,
      );

      const result = await this.collector.collect(
        investigationId,
        normalizedUrl,
        depth,
      );

      // ── Step 3: Complete ──
      await investigationRepo.markComplete(investigationId).catch(() => {});

      await this.#transition(investigationId, "complete", 1.0, {
        completedAt: new Date().toISOString(),
      });

      emitComplete(investigationId);

      // Cleanup SSE listeners after a delay.
      setTimeout(() => emitter.removeAllListeners(investigationId), 5000);

      logger.info("Evidence pipeline complete", {
        investigationId,
        url: normalizedUrl,
        depth,
        durationMs: result.durationMs,
        screenshots: result.screenshots.length,
        networkRequests: result.networkSummary.totalRequests,
        consoleEntries: result.consoleLogs.length,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown pipeline error";

      logger.error({ err, investigationId, url }, "Evidence pipeline crashed");

      await investigationRepo
        .updateStatus(investigationId, {
          status: "failed",
          error: message,
          errorCode: "PIPELINE_CRASH",
        })
        .catch(() => {});

      emitError(investigationId, message, "PIPELINE_CRASH");
      emitPhaseChange(investigationId, "failed", 0);

      setTimeout(() => emitter.removeAllListeners(investigationId), 5000);
    }
  }

  async #transition(
    investigationId: string,
    status: EvidencePipelinePhase,
    progress: number,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    await investigationRepo
      .updateStatus(investigationId, { status, progress })
      .catch(() => {});

    emitPhaseChange(investigationId, status, progress, extra);

    if (progress !== undefined) {
      emitProgress(
        investigationId,
        progress,
        status,
        this.#progressMessage(status),
      );
    }
  }

  #progressMessage(phase: EvidencePipelinePhase): string {
    switch (phase) {
      case "url_validating":
        return "Validating URL and checking reachability...";
      case "collecting_evidence":
        return "Collecting evidence from the page...";
      case "complete":
        return "Investigation complete.";
      case "failed":
        return "Investigation failed.";
      default:
        return "Processing...";
    }
  }
}

// Singleton.
export const evidencePipeline = new EvidencePipeline();
