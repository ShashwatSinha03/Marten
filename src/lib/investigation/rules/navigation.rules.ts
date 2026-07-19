import { ruleRegistry } from "../rule-registry";
import type { Rule, InvestigationContext, RuleMatch } from "../types";

const NAV_EDGE_TYPES = new Set(["navigates_to", "links_to"]);

function getNavigationEdges(ctx: InvestigationContext) {
  if (!ctx.graph) return [];
  return ctx.graph.edges.filter((e) => NAV_EDGE_TYPES.has(e.type));
}

function getPageNodes(ctx: InvestigationContext) {
  if (!ctx.graph) return [];
  return ctx.graph.nodes.filter(
    (n) => n.type === "page" || n.type === "screen",
  );
}

function entryPointNodes(ctx: InvestigationContext): string[] {
  if (!ctx.graph) return [];
  return ctx.graph.nodes
    .filter((n) => n.metadata?.isEntryPoint === true)
    .map((n) => n.id);
}

// ── orphan-page ────────────────────────────────────────────────────

const orphanPageRule: Rule = {
  identifier: "navigation/orphan-page",
  description: "Pages with no incoming navigates_to or links_to edges",
  category: "navigation",
  defaultSeverity: "medium",
  documentation:
    "Checks for pages that no other page links to — they may be inaccessible to users.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const graph = ctx.graph;
    if (!graph || graph.nodes.length === 0) return [];

    const navEdges = getNavigationEdges(ctx);
    const targets = new Set(navEdges.map((e) => e.target));
    const pages = getPageNodes(ctx);

    const results: RuleMatch[] = [];
    for (const node of pages) {
      if (!targets.has(node.id)) {
        results.push({
          fingerprint: `navigation/orphan-page:${node.id}`,
          title: "Orphan page detected",
          description: `Page "${node.label}" (${node.id}) has no incoming navigation or link edges. Users may not be able to reach this page.`,
          severity: "medium",
          evidenceIds: [],
          graphNodeIds: [node.id],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Ensure this page is linked from navigation menus, other pages, or search functionality.",
        });
      }
    }
    return results;
  },
};

// ── dead-end ────────────────────────────────────────────────────────

const deadEndRule: Rule = {
  identifier: "navigation/dead-end",
  description: "Pages with no outgoing navigation edges",
  category: "navigation",
  defaultSeverity: "medium",
  documentation:
    "Checks for pages from which users cannot navigate anywhere else.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const graph = ctx.graph;
    if (!graph || graph.nodes.length === 0) return [];

    const navEdges = getNavigationEdges(ctx);
    const sources = new Set(navEdges.map((e) => e.source));
    const pages = getPageNodes(ctx);

    const results: RuleMatch[] = [];
    for (const node of pages) {
      if (!sources.has(node.id)) {
        results.push({
          fingerprint: `navigation/dead-end:${node.id}`,
          title: "Dead-end page detected",
          description: `Page "${node.label}" (${node.id}) has no outgoing navigation or link edges. Users may get stuck on this page.`,
          severity: "medium",
          evidenceIds: [],
          graphNodeIds: [node.id],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Provide navigation links or a way forward from this page, such as a back-to-home link or related content.",
        });
      }
    }
    return results;
  },
};

// ── excessive-depth ─────────────────────────────────────────────────

const excessiveDepthRule: Rule = {
  identifier: "navigation/excessive-depth",
  description: "Pages deeper than 5 clicks from nearest entry point",
  category: "navigation",
  defaultSeverity: "low",
  documentation:
    "Pages buried deep in the navigation may be hard to discover. Checks BFS depth from entry points.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const graph = ctx.graph;
    if (!graph || graph.nodes.length === 0) return [];

    const navEdges = getNavigationEdges(ctx);
    const adj = new Map<string, string[]>();
    for (const edge of navEdges) {
      if (!adj.has(edge.source)) adj.set(edge.source, []);
      adj.get(edge.source)!.push(edge.target);
    }

    const entries = entryPointNodes(ctx);
    if (entries.length === 0) return [];

    // BFS from all entry points
    const depth = new Map<string, number>();
    const queue: string[] = [];
    for (const e of entries) {
      depth.set(e, 0);
      queue.push(e);
    }
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i];
      const d = depth.get(current)!;
      for (const next of adj.get(current) ?? []) {
        if (!depth.has(next)) {
          depth.set(next, d + 1);
          queue.push(next);
        }
      }
    }

    const results: RuleMatch[] = [];
    for (const node of getPageNodes(ctx)) {
      const d = depth.get(node.id);
      if (d !== undefined && d > 5) {
        results.push({
          fingerprint: `navigation/excessive-depth:${node.id}`,
          title: "Excessive navigation depth",
          description: `Page "${node.label}" is ${d} clicks from the nearest entry point, which may make it hard to discover.`,
          severity: "low",
          evidenceIds: [],
          graphNodeIds: [node.id],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Consider adding direct links to this page from higher-level navigation or the homepage.",
        });
      }
    }
    return results;
  },
};

// ── circular ────────────────────────────────────────────────────────

const circularRule: Rule = {
  identifier: "navigation/circular",
  description: "Cycles in navigation edges",
  category: "navigation",
  defaultSeverity: "low",
  documentation:
    "Detects cycles in the navigation graph, which can confuse users and crawlers.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const graph = ctx.graph;
    if (!graph || graph.nodes.length === 0) return [];

    const navEdges = getNavigationEdges(ctx);
    const adj = new Map<string, string[]>();
    for (const edge of navEdges) {
      if (!adj.has(edge.source)) adj.set(edge.source, []);
      adj.get(edge.source)!.push(edge.target);
    }

    // DFS with recursion stack for cycle detection
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycles: string[][] = [];

    function dfs(nodeId: string, path: string[]) {
      visited.add(nodeId);
      recStack.add(nodeId);
      for (const next of adj.get(nodeId) ?? []) {
        if (!visited.has(next)) {
          dfs(next, [...path, next]);
        } else if (recStack.has(next)) {
          // Cycle detected — capture the path
          const cycleStart = path.indexOf(next);
          if (cycleStart !== -1) {
            cycles.push(path.slice(cycleStart));
          }
        }
      }
      recStack.delete(nodeId);
    }

    const allNodeIds = new Set(navEdges.map((e) => e.source));
    for (const edge of navEdges) allNodeIds.add(edge.target);

    for (const id of allNodeIds) {
      if (!visited.has(id)) dfs(id, [id]);
    }

    const results: RuleMatch[] = [];
    for (let i = 0; i < Math.min(cycles.length, 10); i++) {
      const cycle = cycles[i];
      const nodeIds = cycle.map(
        (id) => graph.nodes.find((n) => n.id === id)?.label ?? id,
      );
      results.push({
        fingerprint: `navigation/circular:${cycle.join("->")}`,
        title: "Circular navigation detected",
        description: `Navigation cycle detected: ${nodeIds.join(" → ")}. Circular navigation paths can confuse users and waste crawl budget.`,
        severity: "low",
        evidenceIds: [],
        graphNodeIds: cycle,
        graphEdgeIds: [],
        recommendationPlaceholder:
          "Review the navigation flow to eliminate unnecessary cycles. Consider adding clear exit points.",
      });
    }
    return results;
  },
};

// ── unreachable ─────────────────────────────────────────────────────

const unreachableRule: Rule = {
  identifier: "navigation/unreachable",
  description: "Nodes with no path from any entry point node",
  category: "navigation",
  defaultSeverity: "high",
  documentation:
    "Detects pages that cannot be reached from any entry point.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const graph = ctx.graph;
    if (!graph || graph.nodes.length === 0) return [];

    const navEdges = getNavigationEdges(ctx);
    const adj = new Map<string, string[]>();
    for (const edge of navEdges) {
      if (!adj.has(edge.source)) adj.set(edge.source, []);
      adj.get(edge.source)!.push(edge.target);
    }

    const entries = entryPointNodes(ctx);
    if (entries.length === 0) return [];

    // BFS from all entry points
    const reachable = new Set<string>(entries);
    const queue = [...entries];
    for (let i = 0; i < queue.length; i++) {
      for (const next of adj.get(queue[i]) ?? []) {
        if (!reachable.has(next)) {
          reachable.add(next);
          queue.push(next);
        }
      }
    }

    const results: RuleMatch[] = [];
    for (const node of getPageNodes(ctx)) {
      if (!reachable.has(node.id)) {
        results.push({
          fingerprint: `navigation/unreachable:${node.id}`,
          title: "Unreachable page detected",
          description: `Page "${node.label}" (${node.id}) has no navigable path from any entry point. Users cannot discover this page.`,
          severity: "high",
          evidenceIds: [],
          graphNodeIds: [node.id],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Add links from entry points or navigation menus to make this page reachable.",
        });
      }
    }
    return results;
  },
};

// ── disconnected-chain ──────────────────────────────────────────────

const disconnectedChainRule: Rule = {
  identifier: "navigation/disconnected-chain",
  description: "Connected components that do not include entry/root nodes",
  category: "navigation",
  defaultSeverity: "medium",
  documentation:
    "Detects isolated groups of pages that form their own navigation cluster disconnected from entry points.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const graph = ctx.graph;
    if (!graph || graph.nodes.length === 0) return [];

    const navEdges = getNavigationEdges(ctx);
    const adj = new Map<string, string[]>();
    for (const edge of navEdges) {
      if (!adj.has(edge.source)) adj.set(edge.source, []);
      adj.get(edge.source)!.push(edge.target);
      if (!adj.has(edge.target)) adj.set(edge.target, []);
      adj.get(edge.target)!.push(edge.source);
    }

    const entries = new Set(entryPointNodes(ctx));
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const [nodeId] of adj) {
      if (visited.has(nodeId)) continue;
      const component: string[] = [];
      const stack = [nodeId];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited.has(current)) continue;
        visited.add(current);
        component.push(current);
        for (const next of adj.get(current) ?? []) {
          if (!visited.has(next)) stack.push(next);
        }
      }
      components.push(component);
    }

    const results: RuleMatch[] = [];
    for (const component of components) {
      if (component.some((id) => entries.has(id))) continue;
      const labels = component.map(
        (id) => graph.nodes.find((n) => n.id === id)?.label ?? id,
      );
      results.push({
        fingerprint: `navigation/disconnected-chain:${component.sort().join(",")}`,
        title: "Disconnected navigation chain",
        description: `An isolated group of pages forms a navigation chain disconnected from entry points: ${labels.join(", ")}.`,
        severity: "medium",
        evidenceIds: [],
        graphNodeIds: component,
        graphEdgeIds: [],
        recommendationPlaceholder:
          "Connect these pages to the main navigation structure so users can reach them from entry points.",
      });
    }
    return results;
  },
};

// ── Register ────────────────────────────────────────────────────────

ruleRegistry.register(orphanPageRule);
ruleRegistry.register(deadEndRule);
ruleRegistry.register(excessiveDepthRule);
ruleRegistry.register(circularRule);
ruleRegistry.register(unreachableRule);
ruleRegistry.register(disconnectedChainRule);

export {
  orphanPageRule,
  deadEndRule,
  excessiveDepthRule,
  circularRule,
  unreachableRule,
  disconnectedChainRule,
};
