import "../rules/navigation.rules";
import { ruleRegistry } from "../rule-registry";
import { detectorRegistry } from "../detector-registry";
import type { Detector, InvestigationContext } from "../types";
import type { Finding } from "@/types";

const navigationDetector: Detector = {
  id: "navigation",
  category: "navigation",
  title: "Navigation Detector",
  description:
    "Detects navigation issues: orphan pages, dead ends, excessive depth, cycles, unreachable pages, and disconnected chains.",
  defaultSeverity: "medium",
  documentation:
    "Analyzes the product graph's navigation edges to find structural navigation problems.",
  ruleIds: [
    "navigation/orphan-page",
    "navigation/dead-end",
    "navigation/excessive-depth",
    "navigation/circular",
    "navigation/unreachable",
    "navigation/disconnected-chain",
  ],
  execute(ctx: InvestigationContext): Finding[] {
    const now = new Date().toISOString();
    const findings: Finding[] = [];
    const results = ruleRegistry.executeRules(this.ruleIds, ctx);

    for (const [ruleId, matches] of results) {
      for (const match of matches) {
        findings.push({
          id: crypto.randomUUID(),
          investigationId: ctx.investigationId,
          title: match.title,
          description: match.description,
          severity: match.severity,
          category: "navigation",
          confidence: 1.0,
          source: "heuristic",
          evidenceRefs: match.evidenceIds.map((id) => ({
            type: "dom_snapshot",
            id,
          })),
          metadata: match.metadata,
          isLowConfidence: false,
          fingerprint: match.fingerprint,
          recommendation: match.recommendationPlaceholder,
          detectorId: this.id,
          ruleId,
          evidenceIds: match.evidenceIds,
          graphNodeIds: match.graphNodeIds,
          graphEdgeIds: match.graphEdgeIds,
          recommendationPlaceholder: match.recommendationPlaceholder,
          createdAt: now,
        });
      }
    }
    return findings;
  },
};

detectorRegistry.register(navigationDetector);

export { navigationDetector };
