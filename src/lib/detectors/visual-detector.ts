import type { Finding } from "@/types";
import type { HeuristicDetector, DetectorContext } from "./types";

/**
 * Detects visual / UI issues: missing viewport meta tag,
 * missing favicon, horizontal overflow, text clipping,
 * missing responsive meta tags, and broken layout patterns.
 */
export const visualDetector: HeuristicDetector = {
  id: "visual",
  name: "Visual Detector",

  detect(ctx: DetectorContext): Finding[] {
    const findings: Finding[] = [];

    for (const dom of ctx.evidence.domSnapshots) {
      const html = (dom.metadata as { html?: string })?.html ?? "";
      if (!html) continue;

      // Check for missing viewport meta tag.
      const hasViewportMeta = /<meta[^>]*name\s*=\s*["']viewport["'][^>]*>/i.test(html);
      if (!hasViewportMeta) {
        findings.push({
          id: crypto.randomUUID(),
          investigationId: "",
          title: "Missing viewport meta tag",
          description: "The page does not include a viewport <meta> tag. Mobile devices may not render the page correctly.",
          severity: "high",
          category: "visual",
          confidence: 0.95,
          source: "heuristic",
          evidenceRefs: [{ type: "dom_snapshot", id: dom.id }],
          isLowConfidence: false,
          recommendation:
            'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>.',
          createdAt: new Date().toISOString(),
          detectorId: "visual",
          ruleId: "visual/viewport",
          evidenceIds: [dom.id],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>.',
        });
      }

      // Check for missing favicon.
      const hasFavicon =
        /<link[^>]*rel\s*=\s*["'](?:shortcut\s+)?icon["'][^>]*>/i.test(html) ||
        /<link[^>]*rel\s*=\s*["']apple-touch-icon["'][^>]*>/i.test(html);
      if (!hasFavicon) {
        findings.push({
          id: crypto.randomUUID(),
          investigationId: "",
          title: "Missing favicon",
          description: "The page does not define a favicon. Browsers will show a default icon in tabs and bookmarks.",
          severity: "low",
          category: "visual",
          confidence: 0.9,
          source: "heuristic",
          evidenceRefs: [{ type: "dom_snapshot", id: dom.id }],
          isLowConfidence: false,
          recommendation: "Add a favicon <link> tag pointing to an .ico or .png file in the <head>.",
          createdAt: new Date().toISOString(),
          detectorId: "visual",
          ruleId: "visual/favicon",
          evidenceIds: [dom.id],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder: "Add a favicon <link> tag pointing to an .ico or .png file in the <head>.",
        });
      }

      // Check for missing or empty title.
      const titleMatch = /<title>([^<]*)<\/title>/i.exec(html);
      if (!titleMatch) {
        findings.push({
          id: crypto.randomUUID(),
          investigationId: "",
          title: "Missing page title",
          description: "The page does not have a <title> tag. The title is critical for SEO, browser tabs, and accessibility.",
          severity: "high",
          category: "visual",
          confidence: 0.95,
          source: "heuristic",
          evidenceRefs: [{ type: "dom_snapshot", id: dom.id }],
          isLowConfidence: false,
            recommendation: "Add a descriptive <title> tag in the <head> section.",
            createdAt: new Date().toISOString(),
            detectorId: "visual",
            ruleId: "visual/title",
            evidenceIds: [dom.id],
            graphNodeIds: [],
            graphEdgeIds: [],
            recommendationPlaceholder: "Add a descriptive <title> tag in the <head> section.",
          });
        } else if (titleMatch[1].trim().length === 0) {
        findings.push({
          id: crypto.randomUUID(),
          investigationId: "",
          title: "Empty page title",
          description: "The <title> tag is present but empty. An empty title provides no useful information.",
          severity: "high",
          category: "visual",
          confidence: 0.95,
          source: "heuristic",
          evidenceRefs: [{ type: "dom_snapshot", id: dom.id }],
          isLowConfidence: false,
            recommendation: "Add descriptive text to the <title> tag.",
            createdAt: new Date().toISOString(),
            detectorId: "visual",
            ruleId: "visual/title",
            evidenceIds: [dom.id],
            graphNodeIds: [],
            graphEdgeIds: [],
            recommendationPlaceholder: "Add descriptive text to the <title> tag.",
          });
        }

        // Check for missing lang attribute on <html>.
      const hasLang = /<html[^>]*\blang\s*=/i.test(html);
      if (!hasLang) {
        findings.push({
          id: crypto.randomUUID(),
          investigationId: "",
          title: "Missing lang attribute on <html>",
          description: "The <html> element is missing a lang attribute. This affects screen reader pronunciation and SEO.",
          severity: "medium",
          category: "visual",
          confidence: 0.95,
          source: "heuristic",
          evidenceRefs: [{ type: "dom_snapshot", id: dom.id }],
          isLowConfidence: false,
          recommendation: 'Add lang="en" (or appropriate language code) to the <html> tag.',
          createdAt: new Date().toISOString(),
          detectorId: "visual",
          ruleId: "visual/lang",
          evidenceIds: [dom.id],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder: 'Add lang="en" (or appropriate language code) to the <html> tag.',
        });
      }

      // Check for missing <!DOCTYPE html>.
      if (!html.trimStart().startsWith("<!DOCTYPE html>") &&
          !html.trimStart().startsWith("<!doctype html>")) {
        findings.push({
          id: crypto.randomUUID(),
          investigationId: "",
          title: "Missing DOCTYPE declaration",
          description: "The page is missing the <!DOCTYPE html> declaration. This may trigger quirks mode in browsers.",
          severity: "medium",
          category: "visual",
          confidence: 0.95,
          source: "heuristic",
          evidenceRefs: [{ type: "dom_snapshot", id: dom.id }],
          isLowConfidence: false,
          recommendation: 'Add <!DOCTYPE html> as the very first line of the document.',
          createdAt: new Date().toISOString(),
          detectorId: "visual",
          ruleId: "visual/doctype",
          evidenceIds: [dom.id],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder: 'Add <!DOCTYPE html> as the very first line of the document.',
        });
      }

      // Check for potential overflow issues (inline styles with fixed width).
      const overflowHidden = html.match(/overflow\s*:\s*hidden/gi);
      const fixedWidth = html.match(/width\s*:\s*\d+px/gi);
      if (overflowHidden && overflowHidden.length > 3) {
        findings.push({
          id: crypto.randomUUID(),
          investigationId: "",
          title: "Excessive use of overflow: hidden",
          description: `Found ${overflowHidden.length} instances of overflow:hidden. Overuse may hide content and cause accessibility issues.`,
          severity: "low",
          category: "visual",
          confidence: 0.6,
          source: "heuristic",
          evidenceRefs: [{ type: "dom_snapshot", id: dom.id }],
          isLowConfidence: true,
          recommendation: "Review overflow:hidden usage. Ensure content is not being unintentionally clipped.",
          createdAt: new Date().toISOString(),
          detectorId: "visual",
          ruleId: "visual/overflow",
          evidenceIds: [dom.id],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder: "Review overflow:hidden usage. Ensure content is not being unintentionally clipped.",
        });
      }

      // Check for missing Open Graph meta tags.
      const hasOgTitle = /<meta[^>]*property\s*=\s*["']og:title["'][^>]*>/i.test(html);
      const hasOgDesc = /<meta[^>]*property\s*=\s*["']og:description["'][^>]*>/i.test(html);
      const hasOgImage = /<meta[^>]*property\s*=\s*["']og:image["'][^>]*>/i.test(html);

      const missingOg: string[] = [];
      if (!hasOgTitle) missingOg.push("og:title");
      if (!hasOgDesc) missingOg.push("og:description");
      if (!hasOgImage) missingOg.push("og:image");

      if (missingOg.length > 0) {
        findings.push({
          id: crypto.randomUUID(),
          investigationId: "",
          title: `Missing Open Graph meta tags (${missingOg.join(", ")})`,
          description: `The page is missing the following Open Graph tags: ${missingOg.join(", ")}. These are required for rich social media previews.`,
          severity: "medium",
          category: "visual",
          confidence: 0.9,
          source: "heuristic",
          evidenceRefs: [{ type: "dom_snapshot", id: dom.id }],
          isLowConfidence: false,
          recommendation: `Add the following meta tags: ${missingOg.map((t) => `<meta property="${t}" content="...">`).join(", ")}`,
          createdAt: new Date().toISOString(),
          detectorId: "visual",
          ruleId: "visual/og-tags",
          evidenceIds: [dom.id],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder: `Add the following meta tags: ${missingOg.map((t) => `<meta property="${t}" content="...">`).join(", ")}`,
        });
      }
    }

    // Check screenshots for potential visual issues (basic).
    for (const screenshot of ctx.evidence.screenshots) {
      const metadata = screenshot.metadata as { type?: string };
      if (metadata?.type === "viewport" && screenshot.size < 1024) {
        findings.push({
          id: crypto.randomUUID(),
          investigationId: "",
          title: "Viewport screenshot appears empty",
          description: `The viewport screenshot is only ${screenshot.size} bytes — the page may render as blank.`,
          severity: "high",
          category: "visual",
          confidence: 0.7,
          source: "heuristic",
          evidenceRefs: [{ type: "screenshot", id: screenshot.id }],
          isLowConfidence: true,
          recommendation: "Check if the page requires JavaScript to render or if it redirects to a login page.",
          createdAt: new Date().toISOString(),
          detectorId: "visual",
          ruleId: "visual/empty-screenshot",
          evidenceIds: [screenshot.id],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder: "Check if the page requires JavaScript to render or if it redirects to a login page.",
        });
      }
    }

    return findings;
  },
};
