import { type Browser, type BrowserContext } from "playwright";
import { launchBrowser, type LaunchedBrowser } from "./launcher";
import { logger } from "@/lib/logger";
import config from "@/lib/config";

interface PoolInstance {
  browser: Browser;
  context: BrowserContext;
  acquiredAt: number;
  inUse: boolean;
  crashed: boolean;
}

export interface PoolStats {
  total: number;
  inUse: number;
  idle: number;
  crashed: number;
}

/**
 * Semaphore-based browser pool.
 *
 * Manages a fixed set (default 3) of Playwright Chromium instances.
 * Acquires block until a browser is available, with a 120 s hard
 * timeout after which the instance is force-killed.
 */
export class BrowserPool {
  private instances: PoolInstance[] = [];
  private maxSize: number;
  private timeoutMs: number;
  private waiting: Array<{
    resolve: (instance: LaunchedBrowser) => void;
    reject: (err: Error) => void;
  }> = [];

  constructor(
    maxSize: number = config.browser.maxConcurrent,
    timeoutMs: number = config.browser.timeoutMs,
  ) {
    this.maxSize = maxSize;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Acquire a browser instance from the pool. Blocks (asynchronously)
   * until one is available.
   */
  async acquire(): Promise<LaunchedBrowser> {
    // Check for an idle, non-crashed instance.
    const idle = this.instances.find((i) => !i.inUse && !i.crashed);
    if (idle) {
      idle.inUse = true;
      idle.acquiredAt = Date.now();
      logger.debug("Browser acquired (reused)", { total: this.instances.length });
      return { browser: idle.browser, context: idle.context };
    }

    // If we can create a new instance, do so.
    if (this.instances.length < this.maxSize) {
      const { browser, context } = await launchBrowser();
      const instance: PoolInstance = {
        browser,
        context,
        acquiredAt: Date.now(),
        inUse: true,
        crashed: false,
      };
      this.instances.push(instance);

      // Monitor for crashes.
      browser.on("disconnected", () => {
        instance.crashed = true;
        instance.inUse = false;
        logger.warn("Browser instance disconnected (crashed)");
      });

      logger.debug("Browser acquired (new)", { total: this.instances.length });
      return { browser, context };
    }

    // Pool is full — queue the request.
    logger.debug("Browser pool full, queuing request", {
      waiting: this.waiting.length + 1,
    });

    return new Promise<LaunchedBrowser>((resolve, reject) => {
      this.waiting.push({ resolve, reject });
    });
  }

  /**
   * Release a browser instance back to the pool.
   */
  release(instance: LaunchedBrowser): void {
    const poolInstance = this.instances.find(
      (i) => i.browser === instance.browser,
    );

    if (poolInstance) {
      poolInstance.inUse = false;
      poolInstance.crashed = false;

      // Force-kill if held beyond the timeout.
      const elapsed = Date.now() - poolInstance.acquiredAt;
      if (elapsed > this.timeoutMs) {
        logger.warn("Browser instance held too long, force-closing", {
          elapsed,
          timeout: this.timeoutMs,
        });
        this.#destroy(poolInstance);
      }
    }

    // Serve the next waiting request.
    this.#serveNext();
  }

  /**
   * Get current pool statistics.
   */
  getStats(): PoolStats {
    return {
      total: this.instances.length,
      inUse: this.instances.filter((i) => i.inUse).length,
      idle: this.instances.filter((i) => !i.inUse && !i.crashed).length,
      crashed: this.instances.filter((i) => i.crashed).length,
    };
  }

  /**
   * Gracefully shut down the pool — close all browser instances.
   */
  async shutdown(): Promise<void> {
    logger.info("Shutting down browser pool", {
      total: this.instances.length,
    });

    // Reject all pending requests.
    for (const waiter of this.waiting) {
      waiter.reject(new Error("Browser pool is shutting down"));
    }
    this.waiting = [];

    // Close all instances.
    await Promise.allSettled(
      this.instances.map((i) => this.#destroy(i)),
    );
    this.instances = [];
  }

  // ── Private ─────────────────────────────────────────────────────

  #serveNext(): void {
    if (this.waiting.length === 0) return;

    const idle = this.instances.find((i) => !i.inUse && !i.crashed);
    if (!idle) return;

    const waiter = this.waiting.shift()!;
    idle.inUse = true;
    idle.acquiredAt = Date.now();
    waiter.resolve({ browser: idle.browser, context: idle.context });
  }

  async #destroy(instance: PoolInstance): Promise<void> {
    try {
      await instance.context.close();
      await instance.browser.close();
    } catch (err) {
      logger.warn("Error destroying browser instance", { err: String(err) });
    }

    // Remove from the pool.
    this.instances = this.instances.filter((i) => i !== instance);
  }
}

// Singleton.
export const browserPool = new BrowserPool();
