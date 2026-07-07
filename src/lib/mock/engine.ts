import { emitter } from "@/lib/sse/emitter";
import { SseEventType } from "@/lib/sse/types";
import { generateMockFindings } from "./findings";
import { logger } from "@/lib/logger";

// ─── Timing ──────────────────────────────────────────────────────

interface TimingDelays {
  start: number;
  toCollecting: number;
  evidenceItems: number[];
  toBuildingGraph?: number;
  graphNodes?: number[];
  graphBuildComplete?: number;
  toInvestigating: number;
  heuristicResults: number[];
  findings: number[];
  llmTokens?: number[];
  toGeneratingReport: number;
  toComplete: number;
}

const MOCK_TIMING: Record<string, { evidenceItemCount: number; findingCount: number; delays: TimingDelays }> = {
  quick: {
    evidenceItemCount: 4,
    findingCount: 3,
    delays: {
      start: 0,
      toCollecting: 300,
      evidenceItems: [800, 1300, 1800, 2400],
      toInvestigating: 3200,
      heuristicResults: [3800],
      findings: [4200, 4800, 5400],
      toGeneratingReport: 6000,
      toComplete: 6600,
    },
  },
  standard: {
    evidenceItemCount: 8,
    findingCount: 6,
    delays: {
      start: 0,
      toCollecting: 400,
      evidenceItems: [700, 1100, 1500, 1900, 2300, 2700, 3200, 3600],
      toBuildingGraph: 4200,
      graphNodes: [4500, 4700, 4900, 5100, 5300, 5500, 5700, 5900],
      graphBuildComplete: 6200,
      toInvestigating: 6600,
      heuristicResults: [7000, 7600, 8200],
      findings: [7200, 7600, 8000, 8600, 9200, 9800],
      llmTokens: [8400, 8700, 9000, 9300],
      toGeneratingReport: 10500,
      toComplete: 12000,
    },
  },
};

// ─── Mock Engine ─────────────────────────────────────────────────

class MockInvestigationEngine {
  private activeEngines = new Set<string>();
  private timeouts = new Map<string, ReturnType<typeof setTimeout>[]>();
  private maxConcurrent = 5;

  /**
   * Start a mock investigation.
   * Returns the investigation ID.
   */
  async start(url: string, depth: "quick" | "standard"): Promise<string> {
    if (this.activeEngines.size >= this.maxConcurrent) {
      throw new Error("Too many concurrent investigations. Please wait and try again.");
    }

    const investigationId = crypto.randomUUID();
    this.activeEngines.add(investigationId);
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    this.timeouts.set(investigationId, timeouts);

    const timing = depth === "standard" ? MOCK_TIMING.standard : MOCK_TIMING.quick;
    const findings = generateMockFindings(url, timing.findingCount, investigationId);

    // Helper to schedule an event
    const schedule = (delay: number, fn: () => void) => {
      const t = setTimeout(fn, delay);
      timeouts.push(t);
    };

    // ── Phase: url_validating ──
    schedule(timing.delays.start, () => {
      emitter.emit(investigationId, {
        type: SseEventType.PhaseChange,
        data: { status: "url_validating", progress: 0 },
      });
      emitter.emit(investigationId, {
        type: SseEventType.ProgressUpdate,
        data: { progress: 0, status: "url_validating" },
      });
    });

    // ── Phase: collecting_evidence ──
    schedule(timing.delays.toCollecting, () => {
      emitter.emit(investigationId, {
        type: SseEventType.PhaseChange,
        data: { status: "collecting_evidence", progress: 0.05 },
      });
      emitter.emit(investigationId, {
        type: SseEventType.ProgressUpdate,
        data: { progress: 0.05, status: "collecting_evidence" },
      });
    });

    // Evidence items
    const evidenceTypes = [
      { type: "screenshot", name: "screenshots/fullpage.png", mime: "image/png", size: 245000, desc: "Full-page screenshot captured" },
      { type: "screenshot", name: "screenshots/viewport.png", mime: "image/png", size: 120000, desc: "Viewport screenshot captured" },
      { type: "dom_snapshot", name: "dom/index.html", mime: "text/html", size: 45000, desc: "DOM snapshot captured" },
      { type: "network_log", name: "logs/network.json", mime: "application/json", size: 18000, desc: "Network request log captured" },
      { type: "console_log", name: "logs/console.json", mime: "application/json", size: 3200, desc: "Console log entries captured", extra: { count: 12 } },
      { type: "screenshot", name: "screenshots/nav-1.png", mime: "image/png", size: 98000, desc: "Navigation state captured" },
      { type: "dom_snapshot", name: "dom/interactive.html", mime: "text/html", size: 32000, desc: "Interactive elements snapshot" },
      { type: "console_log", name: "logs/console-2.json", mime: "application/json", size: 1800, desc: "Additional console entries", extra: { count: 6 } },
    ];

    // Navigate through the URL scheme during evidence collection
    const navUrls = generateNavUrls(url, depth);

    const itemsToEmit = depth === "quick"
      ? evidenceTypes.slice(0, 4)
      : evidenceTypes.slice(0, 8);

    for (let i = 0; i < itemsToEmit.length; i++) {
      const ev = itemsToEmit[i];
      const navUrl = navUrls[i] ?? url;
      schedule(timing.delays.evidenceItems[i], () => {
        emitter.emit(investigationId, {
          type: SseEventType.EvidenceCollected,
          data: {
            id: `ev-${i + 1}`,
            type: ev.type,
            storageKey: ev.name,
            mimeType: ev.mime,
            size: ev.size,
            metadata: {
              description: ev.desc,
              url: navUrl,
              ...ev.extra,
            },
          },
        });
        // Also emit browser navigation event so the frontend can show URL changes
        emitter.emit(investigationId, {
          type: "browser_navigating" as any,
          data: { url: navUrl },
        });
      });
    }

    // ── Phase: building_graph (standard only) ──
    if (depth === "standard" && timing.delays.toBuildingGraph) {
      schedule(timing.delays.toBuildingGraph, () => {
        emitter.emit(investigationId, {
          type: SseEventType.PhaseChange,
          data: { status: "building_graph", progress: 0.4 },
        });
        emitter.emit(investigationId, {
          type: SseEventType.ProgressUpdate,
          data: { progress: 0.4, status: "building_graph" },
        });
      });

      const graphNodeLabels = ["Header", "Navigation", "Hero Section", "Content Grid", "Sidebar", "Footer", "Search Bar", "CTA Button"];
      if (timing.delays.graphNodes) {
        for (let i = 0; i < graphNodeLabels.length && i < timing.delays.graphNodes.length; i++) {
          const idx = i;
          schedule(timing.delays.graphNodes[i], () => {
            emitter.emit(investigationId, {
              type: SseEventType.GraphNodeAdded,
              data: {
                node: {
                  id: `n_${idx + 1}`,
                  type: idx < 3 ? "screen" : idx < 6 ? "component" : "interaction",
                  label: graphNodeLabels[idx],
                  priority: Math.min(idx + 1, 5),
                  metadata: { tagName: "div", selector: `#section-${idx + 1}` },
                },
              },
            });
          });
        }
      }

      if (timing.delays.graphBuildComplete) {
        schedule(timing.delays.graphBuildComplete, () => {
          emitter.emit(investigationId, {
            type: SseEventType.GraphBuildComplete,
            data: { nodeCount: graphNodeLabels.length, edgeCount: 12, quality: 0.78, truncated: false },
          });
        });
      }
    }

    // ── Phase: investigating ──
    schedule(timing.delays.toInvestigating, () => {
      emitter.emit(investigationId, {
        type: SseEventType.PhaseChange,
        data: { status: "investigating", progress: depth === "quick" ? 0.3 : 0.5 },
      });
      emitter.emit(investigationId, {
        type: SseEventType.ProgressUpdate,
        data: { progress: depth === "quick" ? 0.3 : 0.5, status: "investigating" },
      });
    });

    // Heuristic results + findings
    for (let i = 0; i < timing.delays.findings.length; i++) {
      const idx = i;
      if (idx < timing.delays.heuristicResults.length) {
        schedule(timing.delays.heuristicResults[idx], () => {
          const detectors = ["Console Error Detector", "Accessibility Detector", "DOM Structure Detector", "Network Detector", "Visual Detector"];
          emitter.emit(investigationId, {
            type: SseEventType.HeuristicResult,
            data: { detectorId: `detector-${idx + 1}`, detectorName: detectors[idx], findingCount: 1 },
          });
        });
      }

      schedule(timing.delays.findings[idx], () => {
        const finding = findings[idx];
        if (finding) {
          emitter.emit(investigationId, {
            type: SseEventType.FindingDiscovered,
            data: finding as unknown as Record<string, unknown>,
          });
        }
      });
    }

    // LLM tokens (standard only)
    if (depth === "standard" && timing.delays.llmTokens) {
      for (let i = 0; i < timing.delays.llmTokens.length; i++) {
        const idx = i;
        schedule(timing.delays.llmTokens[idx], () => {
          emitter.emit(investigationId, {
            type: SseEventType.LlmProgress,
            data: { promptTokens: 1200 + idx * 100, completionTokens: 400 + idx * 50, totalTokens: 1600 + idx * 150, durationMs: 2000 + idx * 500 },
          });
        });
      }
    }

    // ── Phase: generating_report ──
    schedule(timing.delays.toGeneratingReport, () => {
      emitter.emit(investigationId, {
        type: SseEventType.PhaseChange,
        data: { status: "generating_report", progress: 0.85 },
      });
      emitter.emit(investigationId, {
        type: SseEventType.ProgressUpdate,
        data: { progress: 0.85, status: "generating_report" },
      });
    });

    // ── Complete ──
    const overallScore = calculateScore(findings.length);

    schedule(timing.delays.toComplete, () => {
      emitter.emit(investigationId, {
        type: SseEventType.PhaseChange,
        data: { status: "complete", progress: 1.0 },
      });
      emitter.emit(investigationId, {
        type: SseEventType.Complete,
        data: { investigationId, reportId: crypto.randomUUID(), findingCount: findings.length, overallScore },
      });

      logger.info("Mock investigation complete", { investigationId, url, depth, findings: findings.length });

      // Cleanup listeners after delay
      setTimeout(() => {
        emitter.removeAllListeners(investigationId);
        this.activeEngines.delete(investigationId);
        this.timeouts.delete(investigationId);
      }, 5000);
    });

    logger.info("Mock investigation started", { investigationId, url, depth });

    return investigationId;
  }

  /**
   * Cancel a running mock investigation.
   */
  cancel(investigationId: string): void {
    const timeouts = this.timeouts.get(investigationId);
    if (timeouts) {
      for (const t of timeouts) {
        clearTimeout(t);
      }
      this.timeouts.delete(investigationId);
    }

    emitter.emit(investigationId, {
      type: SseEventType.PhaseChange,
      data: { status: "aborted", progress: 0 },
    });

    emitter.removeAllListeners(investigationId);
    this.activeEngines.delete(investigationId);

    logger.info("Mock investigation cancelled", { investigationId });
  }

  /**
   * Get count of currently running investigations.
   */
  getActiveCount(): number {
    return this.activeEngines.size;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function generateNavUrls(url: string, depth: "quick" | "standard"): string[] {
  const base = url.replace(/\/$/, "");
  if (depth === "quick") {
    return [base, base, base, base];
  }
  return [
    base,
    `${base}/features`,
    `${base}/pricing`,
    `${base}/about`,
    `${base}/login`,
    `${base}/dashboard`,
    `${base}/settings`,
    base,
  ];
}

function calculateScore(findingCount: number): number {
  // Simulate a reasonable score based on finding count
  const base = 85;
  const penalty = findingCount * 4;
  return Math.max(40, Math.min(100, base - penalty + Math.floor(Math.random() * 8)));
}

// Singleton
export const mockEngine = new MockInvestigationEngine();
