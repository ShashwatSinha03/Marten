import { type Page } from "playwright";
import { browserPool } from "@/lib/browser/pool";
import { evidenceStore } from "@/lib/storage/evidence-store";
import { emitter } from "@/lib/sse/emitter";
import { SseEventType } from "@/lib/sse/types";
import { redactSecrets } from "@/lib/security/redact";
import { logger } from "@/lib/logger";
import config from "@/lib/config";
import type { EvidenceItem } from "@/types";
import type { EvidenceBundle } from "./types";

/**
 * EvidenceCollector uses Playwright to capture screenshots, DOM
 * snapshots, console logs, and network activity from a target URL.
 *
 * Quick (≤15 s): screenshots + DOM + console errors only.
 * Standard (≤60 s): full evidence including all network requests.
 */
export class EvidenceCollector {
  /**
   * Collect evidence from the target URL.
   */
  async collect(
    investigationId: string,
    url: string,
    depth: "quick" | "standard",
  ): Promise<EvidenceBundle> {
    const startTime = Date.now();
    const timeout =
      depth === "quick"
        ? config.pipeline.evidenceQuickTimeoutMs
        : config.pipeline.evidenceStandardTimeoutMs;

    const bundle: EvidenceBundle = {
      screenshots: [],
      domSnapshots: [],
      networkLogs: [],
      consoleLogs: [],
    };

    const { browser, context } = await browserPool.acquire();
    let page: Awaited<ReturnType<typeof context.newPage>> | undefined;

    try {
      page = await context.newPage();

      // Collect console logs.
      const consoleEntries: Array<{
        level: string;
        message: string;
        source: string;
        timestamp: number;
        stack?: string;
      }> = [];

      page.on("console", (msg) => {
        const text = msg.text();
        const redacted = redactSecrets(text);
        consoleEntries.push({
          level: msg.type(),
          message: redacted.redacted,
          source: msg.location().url,
          timestamp: Date.now(),
          stack: (msg as unknown as { stackTrace?: () => Array<{ url: string }> }).stackTrace?.()?.map((f) => f.url).join("\n"),
        });
      });

      // Collect network requests (standard depth only).
      const networkEntries: Array<{
        url: string;
        method: string;
        status: number;
        type: string;
        timing: number;
        requestHeaders?: Record<string, string>;
        responseHeaders?: Record<string, string>;
      }> = [];

      if (depth === "standard") {
        page.on("request", (req) => {
          networkEntries.push({
            url: req.url(),
            method: req.method(),
            status: 0, // Will be updated on response.
            type: req.resourceType(),
            timing: 0,
            requestHeaders: req.headers(),
          });
        });

        page.on("response", (res) => {
          const existing = networkEntries.find((e) => e.url === res.url());
          if (existing) {
            existing.status = res.status();
            existing.timing =
              (res as unknown as { timing?: () => Record<string, number> }).timing?.()?.["responseEnd"] ?? 0;
            existing.responseHeaders = res.headers();
          }
        });
      }

      // Navigate to the target.
      await page.goto(url, {
        waitUntil: depth === "quick" ? "domcontentloaded" : "networkidle",
        timeout,
      });

      // Wait a moment for dynamic content.
      await page.waitForTimeout(depth === "quick" ? 1000 : 3000);

      // ── 1. Screenshots ──────────────────────────────────────────

      // Full-page screenshot.
      const fullPageBuffer = await page.screenshot({
        fullPage: true,
        type: "png",
      });
      const screenshotRecord = await evidenceStore.saveScreenshot(
        investigationId,
        fullPageBuffer,
        { type: "full_page", viewport: page.viewportSize() },
      );
      bundle.screenshots.push(this.#toEvidenceItem(screenshotRecord));

      emitter.emit(investigationId, {
        type: SseEventType.EvidenceCollected,
        data: {
          type: "screenshot",
          id: screenshotRecord.id,
          description: "Full-page screenshot captured",
        },
      });

      // Viewport screenshot.
      const viewportBuffer = await page.screenshot({
        type: "png",
      });
      const viewportRecord = await evidenceStore.saveScreenshot(
        investigationId,
        viewportBuffer,
        { type: "viewport", viewport: page.viewportSize() },
      );
      bundle.screenshots.push(this.#toEvidenceItem(viewportRecord));

      // ── 2. DOM Snapshot ─────────────────────────────────────────
      const html = await page.content();
      const domRecord = await evidenceStore.saveDomSnapshot(
        investigationId,
        html,
        { url, title: await page.title() },
      );
      bundle.domSnapshots.push(this.#toEvidenceItem(domRecord));

      emitter.emit(investigationId, {
        type: SseEventType.EvidenceCollected,
        data: {
          type: "dom_snapshot",
          id: domRecord.id,
          description: "DOM snapshot captured",
        },
      });

      // ── 3. Console Logs ─────────────────────────────────────────
      if (consoleEntries.length > 0) {
        const consoleRecord = await evidenceStore.saveConsoleLog(
          investigationId,
          consoleEntries,
          { count: consoleEntries.length, depth },
        );
        bundle.consoleLogs.push(this.#toEvidenceItem(consoleRecord));

        emitter.emit(investigationId, {
          type: SseEventType.EvidenceCollected,
          data: {
            type: "console_log",
            id: consoleRecord.id,
            count: consoleEntries.length,
            description: `${consoleEntries.length} console entries captured`,
          },
        });
      }

      // ── 4. Network Logs ─────────────────────────────────────────
      if (depth === "standard" && networkEntries.length > 0) {
        const networkRecord = await evidenceStore.saveNetworkLog(
          investigationId,
          networkEntries,
          { count: networkEntries.length },
        );
        bundle.networkLogs.push(this.#toEvidenceItem(networkRecord));

        emitter.emit(investigationId, {
          type: SseEventType.EvidenceCollected,
          data: {
            type: "network_log",
            id: networkRecord.id,
            count: networkEntries.length,
            description: `${networkEntries.length} network entries captured`,
          },
        });
      }

      const duration = Date.now() - startTime;
      logger.info("Evidence collection completed", {
        investigationId,
        duration,
        screenshots: bundle.screenshots.length,
        domSnapshots: bundle.domSnapshots.length,
        consoleLogs: bundle.consoleLogs.length,
        networkLogs: bundle.networkLogs.length,
      });

      return bundle;
    } catch (err) {
      logger.error({ err, investigationId, url }, "Evidence collection failed");
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
    metadata: unknown;
    createdAt: Date;
  }): EvidenceItem {
    return {
      id: record.id,
      type: record.type as EvidenceItem["type"],
      storageKey: record.storageKey,
      mimeType: record.mimeType,
      size: record.size,
      metadata: (record.metadata as Record<string, unknown>) ?? {},
      createdAt: record.createdAt.toISOString(),
    };
  }
}
