import { ruleRegistry } from "../rule-registry";
import type { Rule, InvestigationContext, RuleMatch } from "../types";

// ── missing-alt ─────────────────────────────────────────────────────

const missingAltRule: Rule = {
  identifier: "a11y/missing-alt",
  description: "Images without alt attribute",
  category: "accessibility",
  defaultSeverity: "high",
  documentation:
    "Detects image elements that lack alt text, making them inaccessible to screen readers.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const evidence = ctx.evidence;
    const results: RuleMatch[] = [];

    for (const dom of evidence.domSnapshots) {
      const html = (dom.metadata as { html?: string })?.html ?? "";
      if (!html) continue;

      const imgPattern = /<img[^>]*>/gi;
      let match: RegExpExecArray | null;
      while ((match = imgPattern.exec(html)) !== null) {
        if (!/alt\s*=/i.test(match[0])) {
          results.push({
            fingerprint: `a11y/missing-alt:${dom.id}:${match[0].slice(0, 80)}`,
            title: "Image missing alt text",
            description:
              "An <img> element lacks an alt attribute, making it inaccessible to screen readers.",
            severity: "high",
            evidenceIds: [dom.id],
            graphNodeIds: [],
            graphEdgeIds: [],
            recommendationPlaceholder:
              'Add descriptive alt text to all images. Use alt="" for decorative images.',
          });
        }
      }
    }
    return results;
  },
};

// ── empty-button ────────────────────────────────────────────────────

const emptyButtonRule: Rule = {
  identifier: "a11y/empty-button",
  description: "Button with no text content or aria-label",
  category: "accessibility",
  defaultSeverity: "high",
  documentation:
    "Detects button elements that have no accessible name.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const dom = ctx.structuredDom;
    if (!dom) return [];

    const results: RuleMatch[] = [];
    for (const btn of dom.buttons) {
      if (!btn.text && !btn.selector?.includes("aria-label")) {
        results.push({
          fingerprint: `a11y/empty-button:${btn.selector ?? "unknown"}`,
          title: "Empty button detected",
          description:
            "A <button> element has no text content or aria-label. Screen readers cannot identify this button's purpose.",
          severity: "high",
          evidenceIds: [],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder:
            'Add text content or an aria-label attribute to the button to give it an accessible name.',
        });
      }
    }
    return results;
  },
};

// ── heading-hierarchy ───────────────────────────────────────────────

const headingHierarchyRule: Rule = {
  identifier: "a11y/heading-hierarchy",
  description: "Skipped heading levels in document outline",
  category: "accessibility",
  defaultSeverity: "medium",
  documentation:
    "Detects heading level skips that violate the accessible document outline.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const dom = ctx.structuredDom;
    if (!dom || dom.headings.length === 0) return [];

    const results: RuleMatch[] = [];
    const levels = dom.headings.map((h) => h.level);
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] > levels[i - 1] + 1) {
        results.push({
          fingerprint: `a11y/heading-hierarchy:${levels[i - 1]}:${levels[i]}`,
          title: "Skipped heading level",
          description: `Heading level jumps from h${levels[i - 1]} to h${levels[i]}. Screen reader users rely on sequential heading levels for navigation.`,
          severity: "medium",
          evidenceIds: [],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Ensure heading levels follow a sequential hierarchy without skipping (e.g., h1 → h2 → h3, not h1 → h3).",
        });
      }
    }
    return results;
  },
};

// ── unlabeled-input ─────────────────────────────────────────────────

const unlabeledInputRule: Rule = {
  identifier: "a11y/unlabeled-input",
  description: "Input/select/textarea without associated label or aria attribute",
  category: "accessibility",
  defaultSeverity: "high",
  documentation:
    "Detects form controls that lack accessible labels.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const evidence = ctx.evidence;
    const results: RuleMatch[] = [];

    for (const dom of evidence.domSnapshots) {
      const html = (dom.metadata as { html?: string })?.html ?? "";
      if (!html) continue;

      const inputPattern = /<(input|select|textarea)[^>]*>/gi;
      let match: RegExpExecArray | null;
      while ((match = inputPattern.exec(html)) !== null) {
        const tag = match[0];
        const hasAriaLabel = /aria-label\s*=/i.test(tag);
        const hasAriaLabelledby = /aria-labelledby\s*=/i.test(tag);
        const type = tag.match(/type\s*=\s*["']([^"']*)["']/i)?.[1] ?? "text";

        if (!hasAriaLabel && !hasAriaLabelledby && type !== "hidden") {
          results.push({
            fingerprint: `a11y/unlabeled-input:${tag.slice(0, 80)}`,
            title: "Input missing accessible label",
            description: `A <${match[1]} type="${type}"> lacks aria-label, aria-labelledby, or an associated <label>. Screen readers cannot identify this control.`,
            severity: "high",
            evidenceIds: [dom.id],
            graphNodeIds: [],
            graphEdgeIds: [],
            recommendationPlaceholder:
              "Add an aria-label attribute or associate a <label> element using the for attribute.",
          });
        }
      }
    }
    return results;
  },
};

// ── missing-aria ────────────────────────────────────────────────────

const missingAriaRule: Rule = {
  identifier: "a11y/missing-aria",
  description: "Interactive elements missing required ARIA attributes",
  category: "accessibility",
  defaultSeverity: "medium",
  documentation:
    "Detects interactive elements that lack required ARIA attributes for accessibility.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const evidence = ctx.evidence;
    const results: RuleMatch[] = [];

    for (const dom of evidence.domSnapshots) {
      const html = (dom.metadata as { html?: string })?.html ?? "";
      if (!html) continue;

      // Check for nav/main landmarks (ARIA or semantic)
      const hasNav = /<nav[>\s]/i.test(html);
      const hasMain = /<main[>\s]/i.test(html);
      const roleMain = /role\s*=\s*["']main["']/i.test(html);

      if (!hasMain && !roleMain) {
        results.push({
          fingerprint: `a11y/missing-aria:main:${dom.id}`,
          title: "Missing main landmark",
          description:
            "The page does not define a <main> element or role=\"main\" landmark, which is required for screen reader navigation.",
          severity: "medium",
          evidenceIds: [dom.id],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Wrap the primary content in a <main> element or add role=\"main\" to the content container.",
        });
      }

      if (!hasNav) {
        results.push({
          fingerprint: `a11y/missing-aria:nav:${dom.id}`,
          title: "Missing navigation landmark",
          description:
            "The page does not define a <nav> element for navigation. Screen readers rely on landmarks for efficient navigation.",
          severity: "medium",
          evidenceIds: [dom.id],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Wrap navigation links in a <nav> element to define a navigation landmark.",
        });
      }
    }
    return results;
  },
};

// ── duplicate-id ────────────────────────────────────────────────────

const duplicateIdRule: Rule = {
  identifier: "a11y/duplicate-id",
  description: "Same id attribute value on multiple elements",
  category: "accessibility",
  defaultSeverity: "medium",
  documentation:
    "Detects duplicate HTML IDs, which violate HTML specs and cause accessibility issues.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const evidence = ctx.evidence;
    const results: RuleMatch[] = [];

    for (const dom of evidence.domSnapshots) {
      const html = (dom.metadata as { html?: string })?.html ?? "";
      if (!html) continue;

      const idPattern = /\sid\s*=\s*["']([^"']+)["']/gi;
      const idCounts = new Map<string, number>();
      let match: RegExpExecArray | null;
      while ((match = idPattern.exec(html)) !== null) {
        const id = match[1].toLowerCase();
        idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
      }

      for (const [id, count] of idCounts) {
        if (count > 1) {
          results.push({
            fingerprint: `a11y/duplicate-id:${id}:${dom.id}`,
            title: `Duplicate ID detected: "${id}"`,
            description: `The ID "${id}" appears ${count} times. Duplicate IDs violate HTML specifications and can cause JavaScript and accessibility issues.`,
            severity: "medium",
            evidenceIds: [dom.id],
            graphNodeIds: [],
            graphEdgeIds: [],
            recommendationPlaceholder: `Ensure ID "${id}" is unique across the document. Rename duplicates to be distinct.`,
          });
        }
      }
    }
    return results;
  },
};

// ── Register ────────────────────────────────────────────────────────

ruleRegistry.register(missingAltRule);
ruleRegistry.register(emptyButtonRule);
ruleRegistry.register(headingHierarchyRule);
ruleRegistry.register(unlabeledInputRule);
ruleRegistry.register(missingAriaRule);
ruleRegistry.register(duplicateIdRule);

export {
  missingAltRule,
  emptyButtonRule,
  headingHierarchyRule,
  unlabeledInputRule,
  missingAriaRule,
  duplicateIdRule,
};
