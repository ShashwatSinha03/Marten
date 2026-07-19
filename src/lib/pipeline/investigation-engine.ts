import type { Finding } from "@/types";
import type { EvidenceBundle } from "./types";
import type { ProductGraphData } from "@/types";
import type {
  InvestigationContext,
} from "@/lib/investigation/types";
import type {
  StructuredDom,
  NetworkSummary,
  NavigationHistory,
} from "@/lib/evidence/types";
import type {
  RouteGraph,
  ComponentMap,
  NavigationGraphData,
  FlowGraphData,
} from "@/lib/understanding/types";

import { detectorRegistry } from "@/lib/investigation/detector-registry";
import { emitInvestigationProgress } from "@/lib/investigation/sse-helpers";
import { emitter } from "@/lib/sse/emitter";
import { SseEventType } from "@/lib/sse/types";
import { logger } from "@/lib/logger";

/**
 * InvestigationEngine runs all registered detectors via the DetectorRegistry,
 * deduplicates findings by fingerprint, assigns IDs and timestamps,
 * and emits SSE events.
 *
 * This replaces the old manual DETECTORS array approach with the new
 * rule-based investigation system from Sprint 3A.
 */
export class InvestigationEngine {
  /**
   * Run heuristic analysis on the collected evidence and graph.
   *
   * @param investigationId - The investigation to associate findings with.
   * @param evidence        - Captured evidence bundle.
   * @param graph           - Optional product graph for context.
   * @param structuredDom   - Optional structured DOM data.
   * @param networkSummary  - Optional network summary.
   * @param navigationHistory - Optional navigation history.
   * @param routeGraph      - Optional route graph from understanding engine.
   * @param componentMap    - Optional component map from understanding engine.
   * @param navigationGraph - Optional navigation graph from understanding engine.
   * @param flows           - Optional flow data from understanding engine.
   * @param url             - The URL being investigated.
   * @param depth           - Investigation depth.
   * @returns Array of unique findings.
   */
  async investigate(
    investigationId: string,
    evidence: EvidenceBundle,
    graph?: ProductGraphData,
    structuredDom?: StructuredDom,
    networkSummary?: NetworkSummary,
    navigationHistory?: NavigationHistory,
    routeGraph?: RouteGraph,
    componentMap?: ComponentMap,
    navigationGraph?: NavigationGraphData,
    flows?: FlowGraphData,
    url?: string,
    depth?: "quick" | "standard",
  ): Promise<Finding[]> {
    const startTime = Date.now();
    const detectors = detectorRegistry.getAll();

    logger.info("Investigation engine started", {
      investigationId,
      detectorCount: detectors.length,
    });

    // Build enriched investigation context
    const ctx: InvestigationContext = {
      investigationId,
      evidence,
      graph,
      structuredDom,
      networkSummary,
      navigationHistory,
      routeGraph,
      componentMap,
      navigationGraph,
      flows,
      url: url ?? "unknown",
      depth: depth ?? "standard",
    };

    // Emit progress before running detectors
    emitInvestigationProgress(
      investigationId,
      `Running ${detectors.length} heuristic detectors...`,
      0.6,
    );

    // Run all detectors via registry
    const detectorResults = await detectorRegistry.executeAll(ctx);

    // Collect all findings from detector results
    const allFindings: Finding[] = [];
    for (const result of detectorResults) {
      for (const finding of result.findings) {
        finding.investigationId = investigationId;
        allFindings.push(finding);
      }

      // Emit heuristic_result event for each detector
      emitter.emit(investigationId, {
        type: SseEventType.HeuristicResult,
        data: {
          detectorId: result.detectorId,
          detectorName: result.title,
          findingCount: result.findings.length,
          durationMs: result.durationMs,
        },
      });

      logger.debug("Detector completed", {
        detector: result.detectorId,
        findings: result.findings.length,
        durationMs: result.durationMs,
      });
    }

    // Deduplicate by fingerprint.
    const unique = this.#deduplicate(allFindings);

    // Assign fingerprints to any remaining findings.
    for (const finding of unique) {
      if (!finding.fingerprint) {
        finding.fingerprint = this.#generateFingerprint(finding);
      }
    }

    // Assign IDs and timestamps.
    const now = new Date().toISOString();
    const persisted: Finding[] = unique.map((finding) => ({
      ...finding,
      id: finding.id || crypto.randomUUID(),
      createdAt: finding.createdAt || now,
    }));

    // Emit finding_discovered events for each finding.
    for (const finding of persisted) {
      emitter.emit(investigationId, {
        type: SseEventType.FindingDiscovered,
        data: {
          id: finding.id,
          title: finding.title,
          severity: finding.severity,
          category: finding.category,
          confidence: finding.confidence,
        },
      });
    }

    const duration = Date.now() - startTime;
    logger.info("Investigation engine completed", {
      investigationId,
      totalFindings: allFindings.length,
      uniqueFindings: persisted.length,
      duration,
    });

    return persisted;
  }

  // ── Deduplication ──────────────────────────────────────────────

  /**
   * Generate a fingerprint for a finding based on normalized title,
   * category, and overlapping evidence references.
   */
  #generateFingerprint(finding: Finding): string {
    const normalizedTitle = finding.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 100);

    const evidenceKeys = finding.evidenceRefs
      .map((r) => `${r.type}:${r.id}`)
      .sort()
      .join(",");

    return `${normalizedTitle}|${finding.category}|${evidenceKeys}`;
  }

  #deduplicate(findings: Finding[]): Finding[] {
    const seen = new Map<string, Finding>();

    for (const finding of findings) {
      const fp = this.#generateFingerprint(finding);

      if (!seen.has(fp)) {
        seen.set(fp, finding);
      } else {
        // Merge confidence (take the higher one).
        const existing = seen.get(fp)!;
        if (finding.confidence > existing.confidence) {
          existing.confidence = finding.confidence;
        }
        // Merge evidence refs.
        const existingRefs = new Set(
          existing.evidenceRefs.map((r) => `${r.type}:${r.id}`),
        );
        for (const ref of finding.evidenceRefs) {
          const key = `${ref.type}:${ref.id}`;
          if (!existingRefs.has(key)) {
            existing.evidenceRefs.push(ref);
            existingRefs.add(key);
          }
        }
      }
    }

    return [...seen.values()];
  }
}
