import "../rules/console.rules";
import { ruleRegistry } from "../rule-registry";
import { detectorRegistry } from "../detector-registry";
import type { Detector, InvestigationContext } from "../types";
import type { Finding } from "@/types";

const consoleDetector: Detector = {
  id: "console",
  category: "console_error",
  title: "Console Detector",
  description:
    "Detects console issues: JavaScript errors, excessive warnings, and failed resource loads.",
  defaultSeverity: "high",
  documentation:
    "Analyzes browser console logs for errors and warnings.",
  ruleIds: [
    "console/js-error",
    "console/excessive-warning",
    "console/failed-resource",
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
          category: "console_error",
          confidence: 1.0,
          source: "heuristic",
          evidenceRefs: match.evidenceIds.map((id) => ({
            type: "console_log",
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

detectorRegistry.register(consoleDetector);

export { consoleDetector };
