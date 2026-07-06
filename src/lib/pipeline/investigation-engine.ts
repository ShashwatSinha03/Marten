import type { Finding } from "@/types";
import type { EvidenceBundle } from "./types";
import type { ProductGraphData } from "@/types";
import type { DetectorContext } from "@/lib/detectors/types";

import { consoleErrorDetector } from "@/lib/detectors/console-error-detector";
import { accessibilityDetector } from "@/lib/detectors/accessibility-detector";
import { domStructureDetector } from "@/lib/detectors/dom-structure-detector";
import { networkDetector } from "@/lib/detectors/network-detector";
import { visualDetector } from "@/lib/detectors/visual-detector";
import { emitter } from "@/lib/sse/emitter";
import { SseEventType } from "@/lib/sse/types";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { HeuristicDetector } from "@/lib/detectors/types";

const DETECTORS: HeuristicDetector[] = [
  consoleErrorDetector,
  accessibilityDetector,
  domStructureDetector,
  networkDetector,
  visualDetector,
];

/**
 * InvestigationEngine runs all heuristic detectors in parallel,
 * deduplicates findings by fingerprint, and persists them to the DB.
 */
export class InvestigationEngine {
  /**
   * Run heuristic analysis on the collected evidence.
   *
   * @param investigationId - The investigation to associate findings with.
   * @param evidence        - Captured evidence bundle.
   * @param graph           - Optional product graph for context.
   * @returns Array of unique findings.
   */
  async investigate(
    investigationId: string,
    evidence: EvidenceBundle,
    graph?: ProductGraphData,
  ): Promise<Finding[]> {
    const startTime = Date.now();
    const ctx: DetectorContext = { evidence, graph };

    // Run all detectors in parallel.
    const results = await Promise.allSettled(
      DETECTORS.map(async (detector) => {
        try {
          const findings = await Promise.resolve(detector.detect(ctx));

          // Associate each finding with the investigation.
          for (const f of findings) {
            f.investigationId = investigationId;
          }

          // Emit heuristic_result event.
          emitter.emit(investigationId, {
            type: SseEventType.HeuristicResult,
            data: {
              detectorId: detector.id,
              detectorName: detector.name,
              findingCount: findings.length,
            },
          });

          logger.debug("Detector completed", {
            detector: detector.id,
            findings: findings.length,
          });

          return findings;
        } catch (err) {
          logger.error({ err, detector: detector.id }, "Detector failed");
          return [] as Finding[];
        }
      }),
    );

    // Collect all findings.
    const allFindings: Finding[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        allFindings.push(...result.value);
      }
    }

    // Deduplicate by fingerprint.
    const unique = this.#deduplicate(allFindings);

    // Assign fingerprints to persisted findings.
    for (const finding of unique) {
      finding.fingerprint = this.#generateFingerprint(finding);
    }

    // Persist to DB.
    const persisted: Finding[] = [];
    for (const finding of unique) {
      const record = await prisma.finding.create({
        data: {
          investigationId,
          title: finding.title,
          description: finding.description,
          severity: finding.severity,
          category: finding.category,
          confidence: finding.confidence,
          source: finding.source,
          evidenceRefs: finding.evidenceRefs as unknown as Prisma.InputJsonValue,
          metadata: (finding.metadata ?? {}) as Prisma.InputJsonValue,
          isLowConfidence: finding.isLowConfidence,
          fingerprint: finding.fingerprint,
        },
      });

      persisted.push({
        ...finding,
        id: record.id,
        createdAt: record.createdAt.toISOString(),
      });

      // Emit finding_discovered event.
      emitter.emit(investigationId, {
        type: SseEventType.FindingDiscovered,
        data: {
          id: record.id,
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
        const existingRefs = new Set(existing.evidenceRefs.map((r) => `${r.type}:${r.id}`));
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
