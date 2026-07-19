import "../rules/network.rules";
import { ruleRegistry } from "../rule-registry";
import { detectorRegistry } from "../detector-registry";
import type { Detector, InvestigationContext } from "../types";
import type { Finding } from "@/types";

const networkDetector: Detector = {
  id: "network",
  category: "network",
  title: "Network Detector",
  description:
    "Detects network issues: failed requests, redirect chains, slow resources, and excessive third-party domains.",
  defaultSeverity: "high",
  documentation:
    "Analyzes network request logs for performance and reliability issues.",
  ruleIds: [
    "network/failed-request",
    "network/redirect-chain",
    "network/slow-resource",
    "network/excessive-third-party",
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
          category: "network",
          confidence: 1.0,
          source: "heuristic",
          evidenceRefs: match.evidenceIds.map((id) => ({
            type: "network_log",
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

detectorRegistry.register(networkDetector);

export { networkDetector };
