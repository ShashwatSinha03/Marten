import type { Finding } from "@/types";
import type { HeuristicDetector, DetectorContext } from "./types";

/**
 * Detects DOM structure issues: excessive nesting depth, duplicate IDs,
 * broken links, malformed HTML patterns, and oversized DOM trees.
 */
export const domStructureDetector: HeuristicDetector = {
  id: "dom_structure",
  name: "DOM Structure Detector",

  detect(ctx: DetectorContext): Finding[] {
    const findings: Finding[] = [];

    for (const dom of ctx.evidence.domSnapshots) {
      const html = (dom.metadata as { html?: string })?.html ?? "";
      if (!html) continue;

      // Check for duplicate IDs.
      const idPattern = /\sid\s*=\s*["']([^"']+)["']/gi;
      const idCounts = new Map<string, number>();
      let idMatch: RegExpExecArray | null;
      while ((idMatch = idPattern.exec(html)) !== null) {
        const id = idMatch[1].toLowerCase();
        idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
      }

      for (const [id, count] of idCounts) {
        if (count > 1) {
          findings.push({
            id: crypto.randomUUID(),
            investigationId: "",
            title: `Duplicate ID detected: "${id}"`,
            description: `The ID "${id}" appears ${count} times in the document. Duplicate IDs violate HTML specifications and can cause JavaScript/accessibility issues.`,
            severity: "medium",
            category: "dom_structure",
            confidence: 0.95,
            source: "heuristic",
            evidenceRefs: [{ type: "dom_snapshot", id: dom.id }],
            isLowConfidence: false,
            recommendation: `Ensure ID "${id}" is unique across the document. Rename duplicates to be distinct.`,
            createdAt: new Date().toISOString(),
          });
        }
      }

      // Check for excessive nesting (potential performance issue).
      const maxDepth = measureMaxDepth(html);
      if (maxDepth > 30) {
        findings.push({
          id: crypto.randomUUID(),
          investigationId: "",
          title: "Excessive DOM nesting depth",
          description: `The DOM tree has a maximum nesting depth of ${maxDepth} levels. Deep nesting can cause performance issues with rendering and event delegation.`,
          severity: "medium",
          category: "dom_structure",
          confidence: 0.85,
          source: "heuristic",
          evidenceRefs: [{ type: "dom_snapshot", id: dom.id }],
          isLowConfidence: false,
          recommendation: "Flatten the DOM structure. Consider using CSS properties like grid or flexbox instead of nested container divs.",
          createdAt: new Date().toISOString(),
        });
      }

      // Check for large DOM size (potential performance issue).
      const elementCount = (html.match(/<[a-z][^>]*>/gi) ?? []).length;
      if (elementCount > 1500) {
        findings.push({
          id: crypto.randomUUID(),
          investigationId: "",
          title: "Large DOM tree",
          description: `The page contains approximately ${elementCount} DOM elements. Large DOM trees can cause slow rendering, high memory usage, and poor runtime performance.`,
          severity: "low",
          category: "dom_structure",
          confidence: 0.8,
          source: "heuristic",
          evidenceRefs: [{ type: "dom_snapshot", id: dom.id }],
          isLowConfidence: false,
          recommendation: "Reduce the number of DOM elements. Consider lazy loading off-screen content and virtualizing long lists.",
          createdAt: new Date().toISOString(),
        });
      }

      // Check for broken anchor links.
      const anchorPattern = /<a[^>]*href\s*=\s*["']([^"']*)["'][^>]*>/gi;
      let anchorMatch: RegExpExecArray | null;
      while ((anchorMatch = anchorPattern.exec(html)) !== null) {
        const href = anchorMatch[1];
        if (href === "" || href === "#" || href.startsWith("javascript:")) {
          findings.push({
            id: crypto.randomUUID(),
            investigationId: "",
            title: "Empty or JavaScript anchor link",
            description: `Found <a href="${href}">. Empty or javascript: links degrade usability and accessibility.`,
            severity: "low",
            category: "dom_structure",
            confidence: 0.9,
            source: "heuristic",
            evidenceRefs: [{ type: "dom_snapshot", id: dom.id }],
            isLowConfidence: false,
            recommendation: "Use a <button> element for actions and real URLs for navigation. Avoid href=\"#\" or href=\"javascript:void(0)\".",
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    return findings;
  },
};

// ── Helpers ───────────────────────────────────────────────────────

function measureMaxDepth(html: string): number {
  let maxDepth = 0;
  let currentDepth = 0;
  // Simple tag-based depth calculation (ignores self-closing tags properly).
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
  let match: RegExpExecArray | null;

  const selfClosing = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
  ]);

  while ((match = tagPattern.exec(html)) !== null) {
    const isClosing = match[0].startsWith("</");
    const tagName = match[1].toLowerCase();

    if (isClosing) {
      currentDepth = Math.max(0, currentDepth - 1);
    } else if (!selfClosing.has(tagName)) {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    }
  }

  return maxDepth;
}
