import "../rules/form.rules";
import { ruleRegistry } from "../rule-registry";
import { detectorRegistry } from "../detector-registry";
import type { Detector, InvestigationContext } from "../types";
import type { Finding } from "@/types";

const formDetector: Detector = {
  id: "form",
  category: "form",
  title: "Form Detector",
  description:
    "Detects form issues: missing labels, missing submit buttons, duplicated forms, excessive required fields, oversized forms, and isolated forms.",
  defaultSeverity: "high",
  documentation:
    "Analyzes form elements and input fields for usability and accessibility issues.",
  ruleIds: [
    "form/missing-label",
    "form/missing-submit",
    "form/duplicated-form",
    "form/excessive-required",
    "form/oversized-form",
    "form/isolated-form",
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
          category: "form",
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

detectorRegistry.register(formDetector);

export { formDetector };
