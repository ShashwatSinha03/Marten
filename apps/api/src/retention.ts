import type { Repository } from "./repository.js";

interface Options {
  now?: () => number;
  activeId?: () => string | undefined;
  schedule?: (callback: () => void, delay: number) => () => void;
}
interface Result { removed: number; failed: number }

/** Bounded best-effort cleanup while the service is awake; expiry is enforced separately on reads. */
export function createRetentionWorker(
  repository: Pick<Repository, "listExpired" | "remove">,
  options: Options = {},
) {
  let pending: Promise<Result> | undefined;
  let cancelTimer: (() => void) | undefined;
  let stopped = false;
  const schedule = options.schedule ?? ((callback, delay) => {
    const timer = setInterval(callback, delay);
    timer.unref();
    return () => clearInterval(timer);
  });
  const run = (): Promise<Result> => {
    if (pending) return pending;
    if (stopped) return Promise.resolve({ removed: 0, failed: 0 });
    pending = (async () => {
      const result = { removed: 0, failed: 0 };
      try {
        const ids = await repository.listExpired(new Date((options.now ?? Date.now)()).toISOString(), 25);
        for (const id of ids) {
          if (stopped) break;
          if (id === options.activeId?.()) continue;
          try {
            await repository.remove(id);
            result.removed++;
          } catch {
            // Preserve metadata so a later pass can retry incomplete deletions.
            result.failed++;
          }
        }
      } catch {
        result.failed++;
      }
      return result;
    })().finally(() => { pending = undefined; });
    return pending;
  };
  return {
    run,
    start() {
      if (stopped || cancelTimer) return;
      cancelTimer = schedule(() => { void run(); }, 15 * 60_000);
      void run();
    },
    async stop() {
      stopped = true;
      cancelTimer?.();
      await pending;
    },
  };
}
