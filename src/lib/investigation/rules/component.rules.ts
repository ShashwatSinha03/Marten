import { ruleRegistry } from "../rule-registry";
import type { Rule, InvestigationContext, RuleMatch } from "../types";

// ── duplicate-navbar ───────────────────────────────────────────────

const duplicateNavbarRule: Rule = {
  identifier: "component/duplicate-navbar",
  description: "Multiple graph nodes of type navigation with similar labels",
  category: "component",
  defaultSeverity: "medium",
  documentation:
    "Detects multiple navigation elements with similar labels, which may confuse users.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const graph = ctx.graph;
    if (!graph || graph.nodes.length === 0) return [];

    const navNodes = graph.nodes.filter(
      (n) =>
        n.type === "navigation" &&
        n.label.toLowerCase().includes("nav"),
    );

    const results: RuleMatch[] = [];
    if (navNodes.length >= 2) {
      const labels = navNodes.map((n) => `"${n.label}"`).join(", ");
      results.push({
        fingerprint: `component/duplicate-navbar:${navNodes.length}`,
        title: "Duplicate navigation elements",
        description: `Found ${navNodes.length} navigation elements with labels: ${labels}. Multiple navigation structures with similar labels can confuse screen reader users and indicate inconsistent component reuse.`,
        severity: "medium",
        evidenceIds: [],
        graphNodeIds: navNodes.map((n) => n.id),
        graphEdgeIds: [],
        recommendationPlaceholder:
          "Consolidate navigation components into a single shared navbar. Use a single source of truth for navigation structure.",
      });
    }
    return results;
  },
};

// ── repeated-form ──────────────────────────────────────────────────

const repeatedFormRule: Rule = {
  identifier: "component/repeated-form",
  description: "Multiple form nodes with similar attributes/selectors",
  category: "component",
  defaultSeverity: "low",
  documentation:
    "Detects multiple form elements with similar structures, which may indicate missed component reuse.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const graph = ctx.graph;
    if (!graph || graph.nodes.length === 0) return [];

    const formNodes = graph.nodes.filter((n) => n.type === "form");

    const results: RuleMatch[] = [];
    if (formNodes.length >= 3) {
      results.push({
        fingerprint: `component/repeated-form:${formNodes.length}`,
        title: "Repeated form patterns detected",
        description: `Found ${formNodes.length} form elements in the page graph. Multiple similar form structures may indicate opportunities for component reuse.`,
        severity: "low",
        evidenceIds: [],
        graphNodeIds: formNodes.map((n) => n.id),
        graphEdgeIds: [],
        recommendationPlaceholder:
          "Consider extracting repeated form patterns into reusable form components.",
      });
    }
    return results;
  },
};

// ── inconsistent-hierarchy ──────────────────────────────────────────

const inconsistentHierarchyRule: Rule = {
  identifier: "component/inconsistent-hierarchy",
  description: "Heading level jumps in the document outline",
  category: "component",
  defaultSeverity: "medium",
  documentation:
    "Detects heading level skips (e.g., h1 → h3 without h2) that violate accessibility best practices.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const dom = ctx.structuredDom;
    if (!dom || dom.headings.length === 0) return [];

    const results: RuleMatch[] = [];
    const headings = dom.headings;
    for (let i = 1; i < headings.length; i++) {
      const prev = headings[i - 1].level;
      const curr = headings[i].level;
      if (curr > prev + 1) {
        results.push({
          fingerprint: `component/inconsistent-hierarchy:${headings[i - 1].text}:${headings[i].text}`,
          title: "Heading level skipped",
          description: `Heading level jumps from h${prev} ("${headings[i - 1].text}") to h${curr} ("${headings[i].text}"). Skipped heading levels break the document outline for assistive technologies.`,
          severity: "medium",
          evidenceIds: [],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Ensure heading levels follow a logical hierarchy without skipping levels (h1 → h2 → h3, not h1 → h3).",
        });
      }
    }
    return results;
  },
};

// ── missing-structural ──────────────────────────────────────────────

const missingStructuralRule: Rule = {
  identifier: "component/missing-structural",
  description: "No nav, main, or footer elements in the DOM",
  category: "component",
  defaultSeverity: "high",
  documentation:
    "Checks for missing semantic landmark elements that define page structure.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const dom = ctx.structuredDom;
    if (!dom) return [];

    const results: RuleMatch[] = [];

    // structuredDom doesn't have raw HTML. We check via graph nodes.
    const graph = ctx.graph;
    if (!graph) return [];

    const hasNav = graph.nodes.some(
      (n) =>
        n.type === "navigation" ||
        (n.metadata?.tagName === "nav"),
    );
    const hasMain = graph.nodes.some(
      (n) => n.metadata?.tagName === "main",
    );

    const missing: string[] = [];
    if (!hasNav) missing.push("<nav>");
    if (!hasMain) missing.push("<main>");

    if (missing.length > 0) {
      results.push({
        fingerprint: `component/missing-structural:${missing.join(",")}`,
        title: "Missing structural landmark elements",
        description: `The page is missing the following structural landmarks: ${missing.join(", ")}. Semantic landmarks improve navigation for assistive technology users and provide clear page structure.`,
        severity: "high",
        evidenceIds: [],
        graphNodeIds: [],
        graphEdgeIds: [],
        recommendationPlaceholder: `Add the following semantic elements to define page regions: ${missing.join(", ")}.`,
      });
    }
    return results;
  },
};

// ── duplicated-region ───────────────────────────────────────────────

const duplicatedRegionRule: Rule = {
  identifier: "component/duplicated-region",
  description: "Same role/aria-label appearing multiple times",
  category: "component",
  defaultSeverity: "medium",
  documentation:
    "Detects duplicate ARIA landmark regions with the same label.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const graph = ctx.graph;
    if (!graph || graph.nodes.length === 0) return [];

    const regionCount = new Map<string, number>();
    for (const node of graph.nodes) {
      const attrs = node.metadata?.attributes as
        | Record<string, string>
        | undefined;
      const role = attrs?.role ?? "";
      const label = attrs?.["aria-label"] ?? "";
      if (role && ["navigation", "main", "banner", "contentinfo", "region", "complementary"].includes(role)) {
        const key = `${role}:${label}`;
        regionCount.set(key, (regionCount.get(key) ?? 0) + 1);
      }
    }

    const results: RuleMatch[] = [];
    for (const [key, count] of regionCount) {
      if (count > 1) {
        const [role, label] = key.split(":");
        const labelDesc = label ? ` with aria-label "${label}"` : " (no label)";
        results.push({
          fingerprint: `component/duplicated-region:${key}`,
          title: "Duplicated ARIA landmark region",
          description: `The ${role} role${labelDesc} appears ${count} times. Duplicate landmarks with the same label can confuse screen reader navigation.`,
          severity: "medium",
          evidenceIds: [],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Use unique aria-label values or different landmark roles for distinct page regions.",
        });
      }
    }
    return results;
  },
};

// ── Register ────────────────────────────────────────────────────────

ruleRegistry.register(duplicateNavbarRule);
ruleRegistry.register(repeatedFormRule);
ruleRegistry.register(inconsistentHierarchyRule);
ruleRegistry.register(missingStructuralRule);
ruleRegistry.register(duplicatedRegionRule);

export {
  duplicateNavbarRule,
  repeatedFormRule,
  inconsistentHierarchyRule,
  missingStructuralRule,
  duplicatedRegionRule,
};
