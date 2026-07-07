import type { Page } from "playwright";
import type { NavigationEntry, NavigationHistory } from "./types";

/**
 * NavigationTracker listens to a Playwright Page's navigation events
 * and records a history of all visited URLs with timing information.
 */
export class NavigationTracker {
  private entries: NavigationEntry[] = [];
  private startTime = 0;
  private lastUrl = "";
  private currentNavStart = 0;

  /**
   * Start tracking navigations on the given page.
   * Call this BEFORE the first page.goto().
   */
  start(page: Page): void {
    this.startTime = performance.now();

    page.on("framenavigated", (frame) => {
      if (frame !== page.mainFrame()) return;

      const navUrl = frame.url();
      if (navUrl === this.lastUrl) return;

      const now = performance.now();

      // Record the previous navigation duration
      if (this.lastUrl && this.currentNavStart > 0) {
        const lastEntry = this.entries[this.entries.length - 1];
        if (lastEntry) {
          lastEntry.durationMs = now - this.currentNavStart;
        }
      }

      this.lastUrl = navUrl;
      this.currentNavStart = now;

      this.entries.push({
        url: navUrl,
        title: "",
        timestamp: Date.now(),
        durationMs: 0,
        statusCode: 200,
        loadEventMs: 0,
      });
    });
  }

  /**
   * Update the title for the current page.
   */
  async updateTitle(page: Page): Promise<void> {
    try {
      const title = await page.title();
      const current = this.entries[this.entries.length - 1];
      if (current) {
        current.title = title;
      }
    } catch {
      // Ignore title read errors (e.g., crashed page)
    }
  }

  /**
   * Record the final duration for the last navigation once page is idle.
   */
  finalize(url: string): void {
    const now = performance.now();
    const current = this.entries[this.entries.length - 1];
    if (current && current.url === url && this.currentNavStart > 0) {
      current.durationMs = now - this.currentNavStart;
    }
  }

  /**
   * Get the navigation history result.
   */
  getHistory(): NavigationHistory {
    const redirectCount = Math.max(0, this.entries.length - 1);

    return {
      entries: this.entries,
      totalDurationMs: performance.now() - this.startTime,
      pageCount: this.entries.length,
      redirectCount,
    };
  }

  /**
   * Get the current URL being navigated to.
   */
  getCurrentUrl(): string {
    return this.lastUrl;
  }
}
