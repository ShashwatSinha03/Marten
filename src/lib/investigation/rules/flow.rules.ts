import { ruleRegistry } from "../rule-registry";
import type { Rule, InvestigationContext, RuleMatch } from "../types";

// ── disconnected-flow ──────────────────────────────────────────────

const disconnectedFlowRule: Rule = {
  identifier: "flow/disconnected-flow",
  description: "Flow with broken edge path in the graph",
  category: "flow",
  defaultSeverity: "medium",
  documentation:
    "Detects flows whose pages are not fully connected in the navigation graph.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const flowData = ctx.flows;
    const graph = ctx.graph;
    if (!flowData || !graph) return [];

    const results: RuleMatch[] = [];
    for (const flow of flowData.flows) {
      const missingEdges: string[] = [];
      for (let i = 0; i < flow.paths.length - 1; i++) {
        const from = flow.paths[i];
        const to = flow.paths[i + 1];
        const hasEdge = graph.edges.some(
          (e) =>
            (e.type === "navigates_to" || e.type === "links_to") &&
            e.source === from &&
            e.target === to,
        );
        if (!hasEdge) {
          missingEdges.push(`${from} → ${to}`);
        }
      }

      if (missingEdges.length > 0) {
        results.push({
          fingerprint: `flow/disconnected-flow:${flow.id}:${missingEdges.length}`,
          title: "Disconnected flow detected",
          description: `Flow "${flow.name}" (${flow.id}) has ${missingEdges.length} broken connection(s): ${missingEdges.join(", ")}. Users may get stuck navigating through this flow.`,
          severity: "medium",
          evidenceIds: [],
          graphNodeIds: flow.paths,
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Ensure all pages in the flow are connected by navigable links or navigation edges between consecutive steps.",
        });
      }
    }
    return results;
  },
};

// ── incomplete-flow ─────────────────────────────────────────────────

const incompleteFlowRule: Rule = {
  identifier: "flow/incomplete-flow",
  description: "Flow that does not reach an exit point",
  category: "flow",
  defaultSeverity: "medium",
  documentation:
    "Detects flows that have no defined exit point.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const flowData = ctx.flows;
    const navGraph = ctx.navigationGraph;
    if (!flowData) return [];

    const results: RuleMatch[] = [];
    for (const flow of flowData.flows) {
      if (!flow.isComplete || flow.paths.length === 0) {
        results.push({
          fingerprint: `flow/incomplete-flow:${flow.id}`,
          title: "Incomplete flow detected",
          description: `Flow "${flow.name}" (${flow.id}) does not reach an exit point. Users may not be able to complete this flow.`,
          severity: "medium",
          evidenceIds: [],
          graphNodeIds: flow.paths,
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Ensure the flow has a clear completion point, such as a confirmation page, success message, or redirect to a dashboard.",
        });
      }
    }
    return results;
  },
};

// ── isolated-page ───────────────────────────────────────────────────

const isolatedPageRule: Rule = {
  identifier: "flow/isolated-page",
  description: "Page node not belonging to any flow",
  category: "flow",
  defaultSeverity: "low",
  documentation:
    "Detects pages that are not part of any detected user flow.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const flowData = ctx.flows;
    const graph = ctx.graph;
    if (!flowData || !graph) return [];

    const pagesInFlows = new Set<string>();
    for (const flow of flowData.flows) {
      for (const path of flow.paths) {
        pagesInFlows.add(path);
      }
    }

    const pageNodes = graph.nodes.filter(
      (n) => n.type === "page" || n.type === "screen",
    );

    const results: RuleMatch[] = [];
    for (const node of pageNodes) {
      if (!pagesInFlows.has(node.id)) {
        results.push({
          fingerprint: `flow/isolated-page:${node.id}`,
          title: "Isolated page not in any flow",
          description: `Page "${node.label}" (${node.id}) does not belong to any detected user flow. This page may be disconnected from the main user journey.`,
          severity: "low",
          evidenceIds: [],
          graphNodeIds: [node.id],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Review whether this page serves a distinct user flow. If it should be part of a flow, ensure proper navigation links exist.",
        });
      }
    }
    return results;
  },
};

// ── unreachable-endpoint ────────────────────────────────────────────

const unreachableEndpointRule: Rule = {
  identifier: "flow/unreachable-endpoint",
  description: "Form/action endpoint with no graph path to it",
  category: "flow",
  defaultSeverity: "high",
  documentation:
    "Detects endpoints that have no navigable path in the graph.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const graph = ctx.graph;
    if (!graph) return [];

    // Find all endpoint nodes referenced by submits_to edges
    const submitTargets = new Set(
      graph.edges
        .filter((e) => e.type === "submits_to")
        .map((e) => e.target),
    );

    const navEdgeTargets = new Set(
      graph.edges
        .filter(
          (e) =>
            e.type === "navigates_to" || e.type === "links_to",
        )
        .map((e) => e.target),
    );

    const results: RuleMatch[] = [];
    for (const targetId of submitTargets) {
      if (!navEdgeTargets.has(targetId)) {
        const node = graph.nodes.find((n) => n.id === targetId);
        results.push({
          fingerprint: `flow/unreachable-endpoint:${targetId}`,
          title: "Unreachable form endpoint",
          description: `Form submission target "${node?.label ?? targetId}" (${targetId}) has no navigable path in the graph. Users may hit errors when submitting forms to this endpoint.`,
          severity: "high",
          evidenceIds: [],
          graphNodeIds: [targetId],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Ensure the form endpoint is accessible and properly linked. The endpoint should have corresponding GET routes or navigation paths.",
        });
      }
    }
    return results;
  },
};

// ── loop ────────────────────────────────────────────────────────────

const flowLoopRule: Rule = {
  identifier: "flow/loop",
  description: "Cycle detected within a single flow's path",
  category: "flow",
  defaultSeverity: "low",
  documentation:
    "Detects cycles within individual user flows that may indicate navigation issues.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const flowData = ctx.flows;
    if (!flowData) return [];

    const results: RuleMatch[] = [];
    for (const flow of flowData.flows) {
      const seen = new Set<string>();
      const cycles: string[] = [];
      for (const path of flow.paths) {
        if (seen.has(path)) {
          cycles.push(path);
        } else {
          seen.add(path);
        }
      }

      if (cycles.length > 0) {
        results.push({
          fingerprint: `flow/loop:${flow.id}:${cycles.join(",")}`,
          title: "Flow cycle detected",
          description: `Flow "${flow.name}" (${flow.id}) contains ${cycles.length} repeating page(s): ${cycles.join(", ")}. Cycles in a flow may indicate navigation loops that trap users.`,
          severity: "low",
          evidenceIds: [],
          graphNodeIds: cycles,
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Review the flow for unintended navigation loops. Ensure users can always move forward without revisiting the same page.",
        });
      }
    }
    return results;
  },
};

// ── Register ────────────────────────────────────────────────────────

ruleRegistry.register(disconnectedFlowRule);
ruleRegistry.register(incompleteFlowRule);
ruleRegistry.register(isolatedPageRule);
ruleRegistry.register(unreachableEndpointRule);
ruleRegistry.register(flowLoopRule);

export {
  disconnectedFlowRule,
  incompleteFlowRule,
  isolatedPageRule,
  unreachableEndpointRule,
  flowLoopRule,
};
