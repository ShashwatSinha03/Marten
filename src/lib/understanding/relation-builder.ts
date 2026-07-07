import type { GraphNode, GraphEdge, ProductGraphData } from "@/types";
import type { RouteGraph, ComponentMap, NavigationGraphData, FlowGraphData } from "./types";
import type { StructuredDom } from "@/lib/evidence/types";
import { emitGraphNodeAdded, emitGraphEdgeAdded, emitGraphBuildComplete } from "./sse-helpers";

/**
 * RelationBuilder constructs the final ProductGraph node and edge arrays
 * from all understanding engine analyses.
 */
export class RelationBuilder {
  private nodeCounter = 0;
  private edgeCounter = 0;

  /**
   * Build the final GraphNode[] and GraphEdge[] arrays for the ProductGraph.
   * This is the last step before final assembly.
   */
  buildRelations(
    investigationId: string,
    rootUrl: string,
    routeGraph: RouteGraph,
    componentMap: ComponentMap,
    navigationGraph: NavigationGraphData,
    flows: FlowGraphData,
    structuredDom: StructuredDom,
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    this.nodeCounter = 0;
    this.edgeCounter = 0;

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // 1. Create Application root node
    const appNode = this.#makeNode("application", {
      label: structuredDom.title || new URL(rootUrl).hostname,
      route: "/",
      nodeCategory: "application",
      url: rootUrl,
      childCount: routeGraph.routeCount,
    });
    nodes.push(appNode);
    emitGraphNodeAdded(investigationId, appNode);

    // 2. Create Page nodes for each discovered route
    const pageNodeMap = new Map<string, GraphNode>();
    for (const [, route] of routeGraph.routes) {
      // Find flow membership
      const flowMembership = flows.flows.find(f => f.paths.includes(route.path));

      const pageNode = this.#makeNode("page", {
        label: route.title || route.path,
        route: route.path,
        nodeCategory: "page",
        url: route.url,
        visitCount: route.visitCount,
        isEntryPoint: route.isEntryPoint,
        isExitPoint: route.isExitPoint,
        flowId: flowMembership?.id,
        flowName: flowMembership?.name,
        layoutPosition: { x: 0, y: route.depth, layer: 1 },
      });
      nodes.push(pageNode);
      pageNodeMap.set(route.path, pageNode);
      emitGraphNodeAdded(investigationId, pageNode);

      // Application → Page (composes)
      const composesEdge = this.#makeEdge(appNode.id, pageNode.id, "composes", {});
      edges.push(composesEdge);
      emitGraphEdgeAdded(investigationId, composesEdge);
    }

    // 3. Create Component nodes
    const componentNodeMap = new Map<string, GraphNode>();
    const componentKindToNodeType: Record<string, GraphNode["type"]> = {
      navbar: "navigation",
      sidebar: "navigation",
      breadcrumb: "navigation",
      pagination: "navigation",
      footer: "section",
      header: "section",
      hero: "section",
      card: "section",
      section: "section",
      content_section: "section",
      banner: "section",
      carousel: "section",
      tabs: "section",
      accordion: "section",
      dialog: "section",
      modal: "section",
      table: "section",
      stats_grid: "section",
      pricing_card: "section",
      list_group: "section",
      form: "form",
      search_bar: "form",
      navigation_link_group: "navigation",
    };

    for (const comp of componentMap.components) {
      const nodeType = componentKindToNodeType[comp.kind] ?? "component";

      const compNode = this.#makeNode(nodeType, {
        label: comp.textPreview || comp.kind,
        nodeCategory: "ui_component",
        componentKind: comp.kind,
        detectedVia: comp.detectedVia,
        childCount: comp.childCount,
        uniqueClasses: comp.classes,
        selector: comp.selector,
        layoutPosition: { x: 0, y: 0, layer: 2 },
      });
      nodes.push(compNode);
      componentNodeMap.set(comp.id, compNode);
      emitGraphNodeAdded(investigationId, compNode);

      // Component → Page (belongs_to)
      const pageNode = pageNodeMap.get(comp.routePath);
      if (pageNode) {
        const belongsEdge = this.#makeEdge(compNode.id, pageNode.id, "belongs_to", {
          routePath: comp.routePath,
        });
        edges.push(belongsEdge);
        emitGraphEdgeAdded(investigationId, belongsEdge);
      }
    }

    // 4. Create navigation edges (navigates_to)
    for (const navEdge of navigationGraph.edges) {
      const source = pageNodeMap.get(navEdge.sourcePath);
      const target = pageNodeMap.get(navEdge.targetPath);
      if (source && target) {
        const edge = this.#makeEdge(source.id, target.id, "navigates_to", {
          order: navEdge.sequenceOrder,
          frequency: navEdge.frequency,
          linkText: navEdge.linkText,
          durationMs: navEdge.meanTransitionMs,
        });
        edges.push(edge);
        emitGraphEdgeAdded(investigationId, edge);
      }
    }

    // 5. Create links_to edges from route graph
    for (const [, route] of routeGraph.routes) {
      const source = pageNodeMap.get(route.path);
      if (!source) continue;

      for (const targetPath of route.outgoingLinks) {
        const target = pageNodeMap.get(targetPath);
        if (target) {
          const edge = this.#makeEdge(source.id, target.id, "links_to", { url: targetPath });
          // Avoid duplicate if navigates_to already exists
          const isDuplicate = edges.some(
            e => e.source === source.id && e.target === target.id && e.type === "links_to"
          );
          if (!isDuplicate) {
            edges.push(edge);
            emitGraphEdgeAdded(investigationId, edge);
          }
        }
      }
    }

    return { nodes, edges };
  }

  #makeNode(type: GraphNode["type"], meta: Record<string, unknown>): GraphNode {
    this.nodeCounter++;

    const layoutPos = meta.layoutPosition as { x: number; y: number; layer: number } | undefined;
    const isEntryPoint = meta.isEntryPoint === true;
    const nodeLayer = layoutPos?.layer;

    let priority: number;
    if (isEntryPoint) {
      priority = 1;
    } else if (nodeLayer === 2) {
      priority = 3;
    } else {
      priority = 2;
    }

    return {
      id: `n_${this.nodeCounter}`,
      type,
      label: (meta.label as string) ?? type,
      metadata: {
        route: meta.route as string | undefined,
        nodeCategory: meta.nodeCategory as string | undefined,
        componentKind: meta.componentKind as string | undefined,
        detectedVia: meta.detectedVia as string[] | undefined,
        childCount: meta.childCount as number | undefined,
        uniqueClasses: meta.uniqueClasses as string[] | undefined,
        url: meta.url as string | undefined,
        visitCount: meta.visitCount as number | undefined,
        isEntryPoint: meta.isEntryPoint as boolean | undefined,
        isExitPoint: meta.isExitPoint as boolean | undefined,
        flowId: meta.flowId as string | undefined,
        flowName: meta.flowName as string | undefined,
        layoutPosition: meta.layoutPosition as { x: number; y: number; layer: number } | undefined,
        selector: meta.selector as string | undefined,
      },
      priority,
    };
  }

  #makeEdge(
    source: string,
    target: string,
    type: GraphEdge["type"],
    metadata?: Record<string, unknown>,
  ): GraphEdge {
    this.edgeCounter++;
    const edgeMetadata: Record<string, unknown> = {};
    if (metadata) {
      if (metadata.order !== undefined) edgeMetadata.order = metadata.order;
      if (metadata.frequency !== undefined) edgeMetadata.frequency = metadata.frequency;
      if (metadata.linkText !== undefined) edgeMetadata.linkText = metadata.linkText;
      if (metadata.durationMs !== undefined) edgeMetadata.durationMs = metadata.durationMs;
      if (metadata.url !== undefined) edgeMetadata.url = metadata.url;
      if (metadata.routePath !== undefined) edgeMetadata.routePath = metadata.routePath;
      if (metadata.event !== undefined) edgeMetadata.event = metadata.event;
      if (metadata.selector !== undefined) edgeMetadata.selector = metadata.selector;
    }
    return {
      id: `e_${this.edgeCounter}`,
      source,
      target,
      type,
      metadata: edgeMetadata as GraphEdge["metadata"],
    };
  }
}
