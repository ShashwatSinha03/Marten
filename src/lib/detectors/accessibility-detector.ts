import type { Finding } from "@/types";
import type { HeuristicDetector, DetectorContext } from "./types";

/**
 * Detects accessibility issues: missing alt text, missing form labels,
 * missing ARIA landmarks, insufficient color contrast, etc.
 *
 * Analyzes DOM snapshots to identify common a11y violations.
 */
export const accessibilityDetector: HeuristicDetector = {
  id: "accessibility",
  name: "Accessibility Detector",

  detect(ctx: DetectorContext): Finding[] {
    const findings: Finding[] = [];

    for (const dom of ctx.evidence.domSnapshots) {
      const html = (dom.metadata as { html?: string })?.html ?? "";
      if (!html) continue;

      // Check for images without alt text.
      const imgAltPattern = /<img[^>]*>/gi;
      let imgMatch: RegExpExecArray | null;
      while ((imgMatch = imgAltPattern.exec(html)) !== null) {
        const imgTag = imgMatch[0];
        if (!/alt\s*=/i.test(imgTag)) {
          findings.push({
            id: crypto.randomUUID(),
            investigationId: "",
            title: "Image missing alt text",
            description: "An <img> element lacks an alt attribute, making it inaccessible to screen readers.",
            severity: "high",
            category: "accessibility",
            confidence: 0.95,
            source: "heuristic",
            evidenceRefs: [{ type: "dom_snapshot", id: dom.id }],
            isLowConfidence: false,
            recommendation: "Add descriptive alt text to all images. Use alt=\"\" for decorative images.",
            createdAt: new Date().toISOString(),
          });
        }
      }

      // Check for form inputs without labels.
      const inputPattern = /<input[^>]*>/gi;
      let inputMatch: RegExpExecArray | null;
      while ((inputMatch = inputPattern.exec(html)) !== null) {
        const inputTag = inputMatch[0];
        const hasAriaLabel = /aria-label\s*=/i.test(inputTag);
        const hasAriaLabelledby = /aria-labelledby\s*=/i.test(inputTag);
        const type = inputTag.match(/type\s*=\s*["']([^"']*)["']/i)?.[1] ?? "text";

        if (!hasAriaLabel && !hasAriaLabelledby && type !== "hidden") {
          findings.push({
            id: crypto.randomUUID(),
            investigationId: "",
            title: "Form input missing label",
            description: `An <input type="${type}"> lacks an accessible label (aria-label, aria-labelledby, or associated <label>).`,
            severity: "high",
            category: "accessibility",
            confidence: 0.85,
            source: "heuristic",
            evidenceRefs: [{ type: "dom_snapshot", id: dom.id }],
            isLowConfidence: false,
            recommendation: "Add an aria-label attribute or associate a <label> element using the for attribute.",
            createdAt: new Date().toISOString(),
          });
        }
      }

      // Check for missing ARIA landmarks.
      const hasMain = /<main[>\s]/i.test(html);
      const hasNav = /<nav[>\s]/i.test(html);
      const roleMain = /role\s*=\s*["']main["']/i.test(html);

      if (!hasMain && !roleMain) {
        findings.push({
          id: crypto.randomUUID(),
          investigationId: "",
          title: "Missing main landmark",
          description: "The page does not define a <main> element or role=\"main\" landmark.",
          severity: "medium",
          category: "accessibility",
          confidence: 0.9,
          source: "heuristic",
          evidenceRefs: [{ type: "dom_snapshot", id: dom.id }],
          isLowConfidence: false,
          recommendation: "Wrap the primary content in a <main> element to define a landmark for screen readers.",
          createdAt: new Date().toISOString(),
        });
      }

      if (!hasNav) {
        findings.push({
          id: crypto.randomUUID(),
          investigationId: "",
          title: "Missing navigation landmark",
          description: "The page does not define a <nav> element for navigation.",
          severity: "low",
          category: "accessibility",
          confidence: 0.7,
          source: "heuristic",
          evidenceRefs: [{ type: "dom_snapshot", id: dom.id }],
          isLowConfidence: false,
          recommendation: "Wrap navigation links in a <nav> element to improve screen reader navigation.",
          createdAt: new Date().toISOString(),
        });
      }
    }

    return findings;
  },
};
