import "../rules/accessibility.rules";
import { ruleRegistry } from "../rule-registry";
import { detectorRegistry } from "../detector-registry";
import type { Detector, InvestigationContext } from "../types";
import type { Finding } from "@/types";

const accessibilityDetector: Detector = {
  id: "a11y",
  category: "accessibility",
  title: "Accessibility Detector",
  description:
    "Detects accessibility issues: missing alt text, empty buttons, heading hierarchy violations, unlabeled inputs, missing ARIA landmarks, and duplicate IDs.",
  defaultSeverity: "high",
  documentation:
    "Analyzes DOM content for WCAG accessibility violations.",
  ruleIds: [
    "a11y/missing-alt",
    "a11y/empty-button",
    "a11y/heading-hierarchy",
    "a11y/unlabeled-input",
    "a11y/missing-aria",
    "a11y/duplicate-id",
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
          category: "accessibility",
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

detectorRegistry.register(accessibilityDetector);

export { accessibilityDetector };
