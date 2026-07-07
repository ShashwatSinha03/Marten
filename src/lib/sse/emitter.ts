import { EventEmitter } from "node:events";

import { eventRepo } from "@/lib/repositories/event.repository";
import { logger } from "@/lib/logger";
import { SseEventType, type SseEvent, type SseEventPayload } from "./types";

const INVESTIGATION_EVENT_PREFIX = "investigation:";

/**
 * In-process event emitter for investigation SSE events.
 *
 * - Emits events to local subscribers (SSE response streams).
 * - Persists every event to the InvestigationEvent table asynchronously
 *   (fire-and-forget with error logging — never blocks the pipeline).
 * - Each event is assigned an auto-incrementing sequence number scoped
 *   to its investigation.
 */
class SseEmitter {
  private emitter = new EventEmitter();
  /** Per-investigation sequence counter. */
  private sequences = new Map<string, number>();

  // Allow EventEmitter max listeners to scale with concurrent investigations.
  constructor() {
    this.emitter.setMaxListeners(100);
  }

  /**
   * Emit an event for a given investigation.
   *
   * @param investigationId - Target investigation.
   * @param event           - Event payload (type + data). Sequence is assigned automatically.
   */
  emit(investigationId: string, event: Omit<SseEvent, "id">): void {
    const sequence = this.nextSequence(investigationId);
    const fullEvent: SseEvent = { ...event, id: sequence };

    // Notify local in-process subscribers.
    const channel = this.#channel(investigationId);
    this.emitter.emit(channel, fullEvent);

    // Persist to database asynchronously — never block the pipeline.
    this.#persist({
      investigationId,
      sequence,
      eventType: event.type,
      data: event.data,
    }).catch((err) => {
      logger.error({ err, investigationId, sequence }, "Failed to persist SSE event");
    });
  }

  /**
   * Subscribe to all events for a given investigation.
   *
   * @param investigationId - Investigation to listen to.
   * @param callback        - Invoked with each {@link SseEvent}.
   * @returns A cleanup function that removes the listener.
   */
  subscribe(
    investigationId: string,
    callback: (event: SseEvent) => void,
  ): () => void {
    const channel = this.#channel(investigationId);
    this.emitter.on(channel, callback);
    return () => {
      this.emitter.off(channel, callback);
    };
  }

  /**
   * Unsubscribe a specific callback from an investigation.
   */
  unsubscribe(
    investigationId: string,
    callback: (event: SseEvent) => void,
  ): void {
    const channel = this.#channel(investigationId);
    this.emitter.off(channel, callback);
  }

  /**
   * Remove all listeners for a given investigation (cleanup after completion).
   */
  removeAllListeners(investigationId: string): void {
    const channel = this.#channel(investigationId);
    this.emitter.removeAllListeners(channel);
  }

  // ── Private helpers ──────────────────────────────────────────────

  #channel(investigationId: string): string {
    return `${INVESTIGATION_EVENT_PREFIX}${investigationId}`;
  }

  private nextSequence(investigationId: string): number {
    const current = this.sequences.get(investigationId) ?? 0;
    const next = current + 1;
    this.sequences.set(investigationId, next);
    return next;
  }

  async #persist(payload: SseEventPayload): Promise<void> {
    try {
      await eventRepo.create({
        investigationId: payload.investigationId,
        sequence: payload.sequence,
        eventType: payload.eventType,
        data: payload.data,
      });
    } catch (err) {
      // Log but never throw — persistence is best-effort.
      logger.error(
        { err, ...payload },
        "SSE event persistence failed",
      );
    }
  }
}

// Singleton — shared across all modules.
export const emitter = new SseEmitter();
