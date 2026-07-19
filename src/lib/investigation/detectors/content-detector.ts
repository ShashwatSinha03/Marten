import "../rules/content.rules";
import { ruleRegistry } from "../rule-registry";
import { detectorRegistry } from "../detector-registry";
import type { Detector, InvestigationContext } from "../types";
import type { Finding } from "@/types";

const contentDetector: Detector = {
  id: "content",
  category: "content",
  title: "Content Detector",
  description:
    "Detects content issues: empty sections, placeholder text, duplicated headings, missing title/description, and oversized text blocks.",
  defaultSeverity: "medium",
  documentation:
    "Analyzes page content for quality and completeness issues.",
  ruleIds: [
    "content/empty-section",
    "content/placeholder-text",
    "content/duplicated-heading",
    "content/missing-title",
    "content/missing-description",
    "content/oversized-text",
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
          category: "content",
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

detectorRegistry.register(contentDetector);

export { contentDetector };
