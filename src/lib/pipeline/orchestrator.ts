import { Types } from "mongoose";
import { investigationRepo } from "@/lib/repositories/investigation.repository";
import { evidenceRepo } from "@/lib/repositories/evidence.repository";
import { emitter } from "@/lib/sse/emitter";
import { SseEventType } from "@/lib/sse/types";
import { EvidenceCollector } from "./evidence-collector";
import { ProductGraphBuilder } from "./graph-builder";
import { InvestigationEngine } from "./investigation-engine";
import { LlmEvaluation } from "./llm-engine";
import { ReportGenerator } from "./report-generator";
import { investigationQueue } from "@/lib/queue";
import {
  type PipelineContext,
  type StateTransition,
  type StepResult,
  STATE_ORDER,
} from "./types";
import { validateUrl, normalizeUrl } from "@/lib/validators/url";
import { logger } from "@/lib/logger";

/**
 * InvestigationOrchestrator manages the full lifecycle of an investigation.
 *
 * State machine:
 *   pending → url_validating → collecting_evidence → [building_graph] (standard only)
 *   → investigating → generating_report → complete
 *
 * Error transitions from any state → failed (unrecoverable) or
 * partially_complete (recoverable).
 *
 * All state transitions are persisted to the DB and broadcast via SSE.
 */
export class InvestigationOrchestrator {
  private evidenceCollector = new EvidenceCollector();
  private graphBuilder = new ProductGraphBuilder();
  private investigationEngine = new InvestigationEngine();
  private llmEvaluation = new LlmEvaluation();
  private reportGenerator = new ReportGenerator();

  /**
   * Start a new investigation.
   *
   * 1. Creates the Investigation record in the DB with status "pending".
   * 2. Enqueues the full pipeline as a background job.
   * 3. Returns immediately — the caller tracks progress via SSE.
   */
  async start(
    url: string,
    depth: "quick" | "standard",
    userId: string,
  ): Promise<{ investigationId: string }> {
    const normalizedUrl = normalizeUrl(url);

    const investigation = await investigationRepo.create({
      url,
      normalizedUrl,
      depth,
      status: "pending",
      progress: 0,
      userId,
    });

    // Enqueue the pipeline as a background job.
    investigationQueue
      .enqueue(() => this.#runPipeline(investigation.id))
      .catch((err) => {
        logger.error({ err, investigationId: investigation.id }, "Pipeline failed");
      });

    logger.info("Investigation started", {
      id: investigation._id.toString(),
      url: normalizedUrl,
      depth,
    });

    return { investigationId: investigation._id.toString() };
  }

  /**
   * Resume a stale / crashed investigation from its last persisted state.
   */
  async resume(investigationId: string): Promise<void> {
    const investigation = await investigationRepo.findById(investigationId);

    if (!investigation) {
      throw new Error(`Investigation not found: ${investigationId}`);
    }

    if (
      investigation.status === "complete" ||
      investigation.status === "aborted"
    ) {
      return; // Nothing to resume.
    }

    logger.info("Resuming investigation", { id: investigationId, status: investigation.status });

    investigationQueue
      .enqueue(() => this.#runPipeline(investigationId, true))
      .catch((err) => {
        logger.error({ err, investigationId }, "Pipeline resume failed");
      });
  }

  /**
   * Cancel an in-progress investigation gracefully.
   * Persists partial results and marks as "aborted".
   */
  async cancel(investigationId: string): Promise<void> {
    await this.#transition(investigationId, "aborted", 0, {
      abortedAt: new Date().toISOString(),
    });

    logger.info("Investigation cancelled", { id: investigationId });
  }

  // ── Internal pipeline runner ────────────────────────────────────

  async #runPipeline(
    investigationId: string,
    isResume = false,
  ): Promise<void> {
    const ctx = await this.#loadContext(investigationId);

    if (!isResume) {
      // Step 1: URL validation
      await this.#executeStep(ctx, "url_validating", async () => {
        const validatedUrl = await validateUrl(ctx.url);
        ctx.url = validatedUrl;
        return { success: true, progress: 0.05 };
      });
    }

    // Determine starting point from current status.
    const startIdx = STATE_ORDER.indexOf(ctx.status as StateTransition);

    for (let i = startIdx + 1; i < STATE_ORDER.length; i++) {
      const targetState = STATE_ORDER[i];

      // Skip graph building for "quick" investigations.
      if (targetState === "building_graph" && ctx.depth === "quick") {
        await this.#transition(ctx.investigationId, "investigating", 0.4);
        continue;
      }

      const success = await this.#executeStep(ctx, targetState, async () => {
        switch (targetState) {
          case "collecting_evidence": {
            const bundle = await this.evidenceCollector.collect(
              ctx.investigationId,
              ctx.url,
              ctx.depth,
            );
            ctx.evidence = bundle;
            return { success: true, progress: ctx.depth === "quick" ? 0.9 : 0.3 };
          }

          case "building_graph": {
            if (!ctx.evidence) throw new Error("Evidence bundle missing");
            const graph = await this.graphBuilder.build(
              ctx.investigationId,
              ctx.evidence,
            );
            ctx.graph = graph;
            return { success: true, progress: 0.5 };
          }

          case "investigating": {
            if (!ctx.evidence) throw new Error("Evidence bundle missing");

            // Always run heuristic detectors.
            const heuristicFindings = await this.investigationEngine.investigate(
              ctx.investigationId,
              ctx.evidence,
              ctx.graph,
            );

            let allFindings = heuristicFindings;

            // Standard depth also runs LLM evaluation.
            if (ctx.depth === "standard" && ctx.graph) {
              const llmFindings = await this.llmEvaluation.evaluate(
                ctx.investigationId,
                ctx.graph,
                ctx.evidence,
                heuristicFindings,
              );
              allFindings = [...heuristicFindings, ...llmFindings];
            }

            ctx.findings = allFindings;
            return { success: true, progress: 0.85 };
          }

          case "generating_report": {
            if (!ctx.findings) throw new Error("Findings missing");
            const report = await this.reportGenerator.generate(
              ctx.investigationId,
              ctx.findings,
            );
            ctx.report = report;
            return { success: true, progress: 1.0 };
          }

          default:
            return { success: true };
        }
      });

      if (!success) {
        // An error occurred — the step handler already transitioned to
        // failed / partially_complete.
        return;
      }
    }

    // Mark complete with SSE events.
    await this.#transition(ctx.investigationId, "complete", 1.0, {
      completedAt: new Date().toISOString(),
    });
    await investigationRepo.markComplete(investigationId);

    emitter.emit(investigationId, {
      type: SseEventType.Complete,
      data: { investigationId },
    });

    // Cleanup SSE listeners.
    setTimeout(() => emitter.removeAllListeners(investigationId), 5000);

    logger.info("Investigation complete", { id: investigationId });
  }

  /**
   * Execute a single pipeline step with state transitions and error handling.
   */
  async #executeStep(
    ctx: PipelineContext,
    state: StateTransition,
    fn: () => Promise<StepResult>,
  ): Promise<boolean> {
    const startTime = Date.now();

    try {
      // Transition to the new state.
      await this.#transition(ctx.investigationId, state, ctx.progress);

      const result = await fn();

      if (result.progress !== undefined) {
        ctx.progress = result.progress;
      }

      logger.debug("Pipeline step completed", {
        step: state,
        investigationId: ctx.investigationId,
        duration: Date.now() - startTime,
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(
        { err, step: state, investigationId: ctx.investigationId },
        "Pipeline step failed",
      );

      const isRecoverable = this.#isRecoverable(err);
      const targetStatus = isRecoverable ? "pending" : "failed";

      await this.#transition(ctx.investigationId, targetStatus, ctx.progress, {
        error: errorMessage,
        errorCode: isRecoverable ? "PARTIAL_COMPLETE" : "UNRECOVERABLE",
        failedStep: state,
      });

      await investigationRepo.updateStatus(ctx.investigationId, {
        status: targetStatus,
        error: errorMessage,
        errorCode: isRecoverable ? "PARTIAL_COMPLETE" : "UNRECOVERABLE",
      });

      ctx.errors.push({
        step: state,
        message: errorMessage,
        code: isRecoverable ? "PARTIAL_COMPLETE" : "UNRECOVERABLE",
        recoverable: isRecoverable,
        timestamp: new Date(),
      });

      return false;
    }
  }

  async #transition(
    investigationId: string,
    status: StateTransition,
    progress: number,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    // Persist to DB.
    await investigationRepo.updateStatus(investigationId, { status, progress });

    // Emit SSE event.
    emitter.emit(investigationId, {
      type: SseEventType.PhaseChange,
      data: {
        status,
        progress,
        ...extra,
      },
    });

    if (progress !== undefined) {
      emitter.emit(investigationId, {
        type: SseEventType.ProgressUpdate,
        data: { progress, status },
      });
    }
  }

  async #loadContext(investigationId: string): Promise<PipelineContext> {
    const investigation = await investigationRepo.findById(investigationId);

    if (!investigation) {
      throw new Error(`Investigation not found: ${investigationId}`);
    }

    const inv = investigation as typeof investigation & { _id: Types.ObjectId };

    return {
      investigationId: inv._id.toString(),
      url: inv.normalizedUrl,
      depth: inv.depth as "quick" | "standard",
      status: inv.status as PipelineContext["status"],
      progress: inv.progress,
      startedAt: inv.startedAt ?? new Date(),
      errors: [],
    };
  }

  #isRecoverable(err: unknown): boolean {
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      // Timeout and transient network errors are recoverable.
      if (
        msg.includes("timeout") ||
        msg.includes("econnrefused") ||
        msg.includes("econnreset") ||
        msg.includes("etimedout") ||
        msg.includes("dns") ||
        msg.includes("reachable")
      ) {
        return true;
      }
    }
    return false;
  }
}

// Singleton.
export const orchestrator = new InvestigationOrchestrator();
