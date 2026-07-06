import { logger } from "@/lib/logger";

/**
 * Simple in-process async queue that limits concurrent execution.
 *
 * Enqueued functions run in FIFO order with a configurable max
 * concurrency. Useful for background investigation orchestration
 * without an external job queue.
 */
export class AsyncQueue {
  private running = 0;
  private pending: Array<{
    fn: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (err: Error) => void;
  }> = [];

  constructor(private maxConcurrent: number = 5) {}

  /**
   * Enqueue an async function for execution.
   *
   * @returns A promise that resolves with the function's return value
   *          once it has been executed.
   */
  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pending.push({
        fn,
        resolve: resolve as (value: unknown) => void,
        reject: reject as (err: Error) => void,
      });
      this.#processNext();
    });
  }

  /**
   * Get current queue statistics.
   */
  getStats(): { running: number; pending: number } {
    return { running: this.running, pending: this.pending.length };
  }

  // ── Private ─────────────────────────────────────────────────────

  #processNext(): void {
    if (this.running >= this.maxConcurrent) return;
    if (this.pending.length === 0) return;

    const item = this.pending.shift()!;
    this.running++;

    item
      .fn()
      .then((result) => {
        item.resolve(result);
      })
      .catch((err) => {
        item.reject(err);
      })
      .finally(() => {
        this.running--;
        this.#processNext();
      });
  }
}

// Singleton used by the investigation orchestrator.
export const investigationQueue = new AsyncQueue(3);
