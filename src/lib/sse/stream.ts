import { type SseEvent } from "@/lib/sse/types";
import { eventRepo } from "@/lib/repositories/event.repository";
import { emitter } from "@/lib/sse/emitter";
import config from "@/lib/config";

/**
 * Creates a ReadableStream that yields SSE-formatted text for a given
 * investigation. New connections first replay all past events (starting
 * from `lastEventId`), then subscribe to the in-process emitter for
 * live events. A heartbeat is sent every 15 s to keep the connection
 * alive.
 *
 * @param investigationId - The investigation to stream events for.
 * @param lastEventId     - Optional sequence ID for reconnection replay.
 * @returns A ReadableStream<string> that the Next.js route handler can
 *          pipe directly to the response.
 */
export function createSseStream(
  investigationId: string,
  lastEventId?: string,
): ReadableStream<string> {
  const lastSequence = lastEventId ? Number.parseInt(lastEventId, 10) : 0;

  let controller: ReadableStreamDefaultController<string>;
  let cleanup: (() => void) | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  return new ReadableStream<string>({
    async start(ctrl) {
      controller = ctrl;

      try {
        // ── Replay past events ──────────────────────────────────
        if (lastSequence > 0) {
          const pastEvents = await eventRepo.findAfterSequence(investigationId, lastSequence);

          for (const event of pastEvents) {
            enqueueSseEvent(controller, {
              type: event.eventType as SseEvent["type"],
              id: event.sequence,
              data: (event.data ?? {}) as Record<string, unknown>,
            });
          }
        }

        // ── Subscribe to live events ────────────────────────────
        cleanup = emitter.subscribe(investigationId, (event) => {
          try {
            enqueueSseEvent(controller, event);
          } catch {
            // Stream may have closed (client disconnect).
          }
        });

        // ── Heartbeat every 15 s ────────────────────────────────
        heartbeatTimer = setInterval(() => {
          try {
            controller.enqueue(`:heartbeat ${Date.now()}\n\n`);
          } catch {
            // Stream closed.
          }
        }, config.sse.heartbeatIntervalMs);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error during SSE setup";
        controller.enqueue(
          `event: error\ndata: ${JSON.stringify({ message: errorMessage })}\n\n`,
        );
        controller.close();
      }
    },

    cancel() {
      // Client disconnected — clean up resources.
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (cleanup) cleanup();
      emitter.removeAllListeners(investigationId);
    },
  });
}

// ── Helpers ────────────────────────────────────────────────────────

function enqueueSseEvent(
  controller: ReadableStreamDefaultController<string>,
  event: SseEvent,
): void {
  const fields = [`id: ${event.id}`, `event: ${event.type}`];

  if (event.data && typeof event.data === "object") {
    fields.push(`data: ${JSON.stringify(event.data)}`);
  }

  controller.enqueue(fields.join("\n") + "\n\n");
}
