import { browserPool } from "@/lib/browser/pool";
import { evidenceStore } from "@/lib/storage/evidence-store";
import config from "@/lib/config";
import { logger } from "@/lib/logger";
import { extractStructuredDom } from "./dom-extractor";
import { createNetworkSummary } from "./network-summarizer";
import { NavigationTracker } from "./navigation-tracker";
import { emitEvidenceCollected, emitProgress } from "./sse-helpers";
import type { EvidenceCollectionResult } from "./types";
import type { EvidenceItem } from "@/types";

/**
 * EnhancedEvidenceCollector collects Playwright evidence (screenshots,
 * DOM snapshots, console logs, network logs) and adds structured DOM
 * extraction, network summarization, and navigation tracking.
 *
 * Quick (≤15 s): screenshots + raw DOM + console errors + structured DOM.
 * Standard (≤60 s): all of the above + network summary.
 */
export class EnhancedEvidenceCollector {

  async collect(
    investigationId: string,
    url: string,
    depth: "quick" | "standard",
  ): Promise<EvidenceCollectionResult> {
    const startTime = Date.now();
    const timeout =
      depth === "quick"
        ? config.pipeline.evidenceQuickTimeoutMs
        : config.pipeline.evidenceStandardTimeoutMs;

    const { browser, context } = await browserPool.acquire();
    let page: Awaited<ReturnType<typeof context.newPage>> | undefined;

    try {
      page = await context.newPage();
      const tracker = new NavigationTracker();
      tracker.start(page);

      // Collect console logs.
      const consoleEntries: Array<{
        level: string;
        message: string;
        source: string;
        timestamp: number;
      }> = [];

      page.on("console", (msg) => {
        consoleEntries.push({
          level: msg.type(),
          message: msg.text(),
          source: msg.location().url,
          timestamp: Date.now(),
        });
      });

      // Network entries for summary (standard depth only).
      const allNetworkEntries: Array<{
        url: string;
        method: string;
        status: number;
        type: string;
        timing: number;
      }> = [];

      if (depth === "standard") {
        page.on("request", (req) => {
          allNetworkEntries.push({
            url: req.url(),
            method: req.method(),
            status: 0,
            type: req.resourceType(),
            timing: 0,
          });
        });

        page.on("response", (res) => {
          const existing = allNetworkEntries.find((e) => e.url === res.url());
          if (existing) {
            existing.status = res.status();
            existing.timing =
              (
                res as unknown as {
                  timing?: () => Record<string, number>;
                }
              ).timing?.()?.["responseEnd"] ?? 0;
          }
        });
      }

      // Navigate to target.
      await page.goto(url, {
        waitUntil: depth === "quick" ? "domcontentloaded" : "networkidle",
        timeout,
      });

      await page.waitForTimeout(depth === "quick" ? 1000 : 3000);

      // Update navigation tracker with final page info.
      await tracker.updateTitle(page);
      tracker.finalize(url);

      // ── 1. Screenshots ──

      // Full-page screenshot.
      const fullPageBuffer = await page.screenshot({ fullPage: true, type: "png" });
      const screenshotRecord = await evidenceStore.saveScreenshot(
        investigationId,
        fullPageBuffer,
        { type: "full_page", viewport: page.viewportSize() },
      );
      const screenshotItem = this.#toEvidenceItem(screenshotRecord);
      emitEvidenceCollected(investigationId, screenshotItem);

      // Viewport screenshot.
      const viewportBuffer = await page.screenshot({ type: "png" });
      const viewportRecord = await evidenceStore.saveScreenshot(
        investigationId,
        viewportBuffer,
        { type: "viewport", viewport: page.viewportSize() },
      );
      const viewportItem = this.#toEvidenceItem(viewportRecord);
      emitEvidenceCollected(investigationId, viewportItem);

      // ── 2. Raw DOM snapshot ──
      const html = await page.content();
      const domRecord = await evidenceStore.saveDomSnapshot(
        investigationId,
        html,
        { url, title: await page.title() },
      );
      const domItem = this.#toEvidenceItem(domRecord);
      emitEvidenceCollected(investigationId, domItem);

      // ── 3. Console logs ──
      let consoleItem: EvidenceItem | undefined;
      if (consoleEntries.length > 0) {
        const consoleRecord = await evidenceStore.saveConsoleLog(
          investigationId,
          consoleEntries,
          { count: consoleEntries.length, depth },
        );
        consoleItem = this.#toEvidenceItem(consoleRecord);
        emitEvidenceCollected(investigationId, consoleItem);
      }

      // ── 4. Network logs (standard only) ──
      let networkItem: EvidenceItem | undefined;
      if (depth === "standard" && allNetworkEntries.length > 0) {
        const networkRecord = await evidenceStore.saveNetworkLog(
          investigationId,
          allNetworkEntries,
          { count: allNetworkEntries.length },
        );
        networkItem = this.#toEvidenceItem(networkRecord);
        emitEvidenceCollected(investigationId, networkItem);
      }

      // ── 5. Structured DOM extraction ──
      emitProgress(investigationId, 0.5, "collecting_evidence", "Analyzing page structure...");
      const structuredDom = await extractStructuredDom(page, url);

      // ── 6. Network summary ──
      emitProgress(investigationId, 0.6, "collecting_evidence", "Summarizing network activity...");
      const networkSummary = createNetworkSummary(allNetworkEntries);

      // ── 7. Navigation history ──
      const navigationHistory = tracker.getHistory();

      const durationMs = Date.now() - startTime;

      logger.info("Enhanced evidence collection completed", {
        investigationId,
        durationMs,
        url,
        depth,
      });

      return {
        screenshots: [screenshotItem, viewportItem],
        domSnapshots: [domItem],
        networkLogs: networkItem ? [networkItem] : [],
        consoleLogs: consoleItem ? [consoleItem] : [],
        structuredDom,
        networkSummary,
        navigationHistory,
        durationMs,
        url,
        depth,
      };
    } catch (err) {
      logger.error({ err, investigationId, url }, "Enhanced evidence collection failed");
      throw err;
    } finally {
      await page?.close().catch(() => {});
      browserPool.release({ browser, context });
    }
  }

  #toEvidenceItem(record: {
    id: string;
    type: string;
    storageKey: string;
    mimeType: string;
    size: number;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
  }): EvidenceItem {
    return {
      id: record.id,
      type: record.type as EvidenceItem["type"],
      storageKey: record.storageKey,
      mimeType: record.mimeType,
      size: record.size,
      metadata: record.metadata ?? {},
      createdAt: record.createdAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}
