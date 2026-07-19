import "../rules/cta.rules";
import { ruleRegistry } from "../rule-registry";
import { detectorRegistry } from "../detector-registry";
import type { Detector, InvestigationContext } from "../types";
import type { Finding } from "@/types";

const ctaDetector: Detector = {
  id: "cta",
  category: "cta",
  title: "CTA Detector",
  description:
    "Detects call-to-action issues: multiple primary CTAs, no primary CTA, conflicting actions, and inconsistent positioning.",
  defaultSeverity: "medium",
  documentation:
    "Analyzes buttons and links to find issues with calls to action.",
  ruleIds: [
    "cta/multiple-primary",
    "cta/no-primary",
    "cta/conflicting-action",
    "cta/inconsistent-positioning",
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
          category: "cta",
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

detectorRegistry.register(ctaDetector);

export { ctaDetector };
