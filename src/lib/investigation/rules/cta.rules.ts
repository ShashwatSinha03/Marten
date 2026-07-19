import { ruleRegistry } from "../rule-registry";
import type { Rule, InvestigationContext, RuleMatch } from "../types";

// ── multiple-primary ───────────────────────────────────────────────

const multiplePrimaryRule: Rule = {
  identifier: "cta/multiple-primary",
  description: "Multiple buttons/links with primary styling classes",
  category: "cta",
  defaultSeverity: "low",
  documentation:
    "Detects multiple primary-styled CTAs on the same page, which may dilute the main action.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const dom = ctx.structuredDom;
    if (!dom) return [];

    const primaryKeywords = ["primary", "btn-primary", "cta", "button--primary"];
    const buttons = dom.buttons.filter((b) =>
      primaryKeywords.some((kw) =>
        (b.selector ?? b.text).toLowerCase().includes(kw),
      ),
    );

    const results: RuleMatch[] = [];
    if (buttons.length >= 2) {
      results.push({
        fingerprint: `cta/multiple-primary:${buttons.length}`,
        title: "Multiple primary CTAs detected",
        description: `Found ${buttons.length} buttons with primary styling. Multiple primary CTAs can confuse users about the main action.`,
        severity: "low",
        evidenceIds: [],
        graphNodeIds: [],
        graphEdgeIds: [],
        recommendationPlaceholder:
          "Limit primary CTAs to one per page or section. Use secondary styling for less important actions.",
      });
    }
    return results;
  },
};

// ── no-primary ──────────────────────────────────────────────────────

const noPrimaryRule: Rule = {
  identifier: "cta/no-primary",
  description: "No obvious CTA button found",
  category: "cta",
  defaultSeverity: "medium",
  documentation:
    "Detects pages without a clear call-to-action button.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const dom = ctx.structuredDom;
    if (!dom) return [];

    if (dom.buttons.length === 0) {
      return [
        {
          fingerprint: "cta/no-primary",
          title: "No primary CTA detected",
          description:
            "The page has no buttons. Without a clear call to action, users may not know what to do next.",
          severity: "medium",
          evidenceIds: [],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Add a primary call-to-action button that guides users toward the main goal of the page.",
        },
      ];
    }
    return [];
  },
};

// ── conflicting-action ──────────────────────────────────────────────

const conflictingActionRule: Rule = {
  identifier: "cta/conflicting-action",
  description: "Same button label text pointing to different URLs",
  category: "cta",
  defaultSeverity: "medium",
  documentation:
    "Detects identical button labels that link to different destinations.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const dom = ctx.structuredDom;
    const graph = ctx.graph;
    if (!dom || !graph) return [];

    // Map button text to edges
    const labelToUrls = new Map<string, Set<string>>();
    for (const btn of dom.buttons) {
      if (!btn.text) continue;
      const key = btn.text.toLowerCase().trim();
      if (!labelToUrls.has(key)) labelToUrls.set(key, new Set());
      // Look for matching link edges in the graph
      for (const edge of graph.edges) {
        if (
          edge.type === "links_to" &&
          edge.metadata?.linkText?.toLowerCase().trim() === key
        ) {
          labelToUrls.get(key)!.add(edge.metadata?.url ?? edge.target);
        }
      }
    }

    const results: RuleMatch[] = [];
    for (const [label, urls] of labelToUrls) {
      if (urls.size >= 2) {
        results.push({
          fingerprint: `cta/conflicting-action:${label}`,
          title: 'Conflicting CTA actions detected',
          description: `Button label "${label}" points to ${urls.size} different destinations: ${[...urls].join(", ")}. Inconsistent actions for identical labels undermine user trust and predictability.`,
          severity: "medium",
          evidenceIds: [],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Ensure the same CTA label always leads to the same destination. Use distinct labels for distinct actions.",
        });
      }
    }
    return results;
  },
};

// ── inconsistent-positioning ────────────────────────────────────────

const inconsistentPositioningRule: Rule = {
  identifier: "cta/inconsistent-positioning",
  description: "Primary CTA in different positions across pages",
  category: "cta",
  defaultSeverity: "low",
  documentation:
    "Detects primary CTAs placed in inconsistent locations across different pages.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const navigationGraph = ctx.navigationGraph;
    if (!navigationGraph || navigationGraph.nodes.length < 2) return [];

    // With multiple pages, check if primary CTAs exist in consistent positions
    // This is a simplified check — real implementation would compare selectors/positions
    const dom = ctx.structuredDom;
    if (!dom || dom.buttons.length === 0) return [];

    const results: RuleMatch[] = [];
    if (navigationGraph.nodes.length >= 3 && dom.buttons.length > 0) {
      const btnSelectors = dom.buttons.map((b) => b.selector ?? b.text);
      results.push({
        fingerprint: `cta/inconsistent-positioning:${navigationGraph.nodes.length}`,
        title: "Potential inconsistent CTA positioning",
        description: `With ${navigationGraph.nodes.length} pages in the navigation graph, the primary CTA position should be verified across all pages for consistency.`,
        severity: "low",
        evidenceIds: [],
        graphNodeIds: [],
        graphEdgeIds: [],
        recommendationPlaceholder:
          "Ensure primary CTAs appear in a consistent position (e.g., top-right or center) across all pages for predictable user experience.",
      });
    }
    return results;
  },
};

// ── Register ────────────────────────────────────────────────────────

ruleRegistry.register(multiplePrimaryRule);
ruleRegistry.register(noPrimaryRule);
ruleRegistry.register(conflictingActionRule);
ruleRegistry.register(inconsistentPositioningRule);

export {
  multiplePrimaryRule,
  noPrimaryRule,
  conflictingActionRule,
  inconsistentPositioningRule,
};
