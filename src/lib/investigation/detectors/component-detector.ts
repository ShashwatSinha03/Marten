import "../rules/component.rules";
import { ruleRegistry } from "../rule-registry";
import { detectorRegistry } from "../detector-registry";
import type { Detector, InvestigationContext } from "../types";
import type { Finding } from "@/types";

const componentDetector: Detector = {
  id: "component",
  category: "component",
  title: "Component Detector",
  description:
    "Detects component-related issues: duplicate navbars, repeated forms, inconsistent heading hierarchy, missing structural elements, and duplicated regions.",
  defaultSeverity: "medium",
  documentation:
    "Analyzes the product graph and structured DOM for component-level issues.",
  ruleIds: [
    "component/duplicate-navbar",
    "component/repeated-form",
    "component/inconsistent-hierarchy",
    "component/missing-structural",
    "component/duplicated-region",
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
          category: "component",
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

detectorRegistry.register(componentDetector);

export { componentDetector };
