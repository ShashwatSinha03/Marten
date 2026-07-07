import config from "@/lib/config";
import { investigationRepo } from "@/lib/repositories/investigation.repository";
import { logger } from "@/lib/logger";
import { RouteDiscoverer } from "./route-discoverer";
import { ComponentMapper } from "./component-mapper";
import { NavigationGraphBuilder } from "./navigation-graph";
import { FlowDetector } from "./flow-detector";
import { RelationBuilder } from "./relation-builder";
import { emitGraphProgress, emitGraphBuildComplete } from "./sse-helpers";
import type { EvidenceCollectionResult } from "@/lib/evidence/types";
import type { ProductGraphData } from "@/types";

/**
 * UnderstandingEngine is the main orchestrator for Sprint 2B.
 *
 * It consumes EvidenceCollectionResult and produces a ProductGraphData
 * by running route discovery, component mapping, navigation graph
 * construction, flow detection, and relation building in sequence.
 *
 * This replaces the old ProductGraphBuilder (src/lib/pipeline/graph-builder.ts).
 */
export class UnderstandingEngine {
  private routeDiscoverer = new RouteDiscoverer();
  private componentMapper = new ComponentMapper();
  private navigationGraphBuilder = new NavigationGraphBuilder();
  private flowDetector = new FlowDetector();
  private relationBuilder = new RelationBuilder();

  /**
   * Build a ProductGraph from collected evidence.
   */
  async build(
    investigationId: string,
    evidence: EvidenceCollectionResult,
  ): Promise<ProductGraphData> {
    const startTime = Date.now();
    const { url, depth, structuredDom, navigationHistory } = evidence;

    logger.info("Building product graph", { investigationId, url });

    // Phase 1: Route Discovery
    emitGraphProgress(investigationId, "Building application map...", 0.1);
    const routeGraph = this.routeDiscoverer.discoverRoutes(
      navigationHistory,
      structuredDom,
      url,
    );

    // Phase 2: Component Mapping
    emitGraphProgress(investigationId, "Identifying reusable components...", 0.3);
    const componentMap = this.componentMapper.mapComponents(
      structuredDom,
      routeGraph.rootPath,
    );

    // Phase 3: Navigation Graph
    emitGraphProgress(investigationId, "Mapping navigation paths...", 0.5);
    const navigationGraph = this.navigationGraphBuilder.buildNavigationGraph(
      routeGraph,
      navigationHistory,
    );

    // Phase 4: Flow Detection
    emitGraphProgress(investigationId, "Detecting application flows...", 0.7);
    const flows = this.flowDetector.detectFlows(
      navigationGraph,
      navigationHistory,
    );

    // Phase 5: Relation Building
    emitGraphProgress(investigationId, "Constructing Product Graph...", 0.85);
    const { nodes, edges } = this.relationBuilder.buildRelations(
      investigationId,
      url,
      routeGraph,
      componentMap,
      navigationGraph,
      flows,
      structuredDom,
    );

    // Phase 6: Final assembly
    const maxNodes = config.limits.graphMaxNodes;
    let truncated = false;

    if (nodes.length > maxNodes) {
      nodes.splice(maxNodes);
      truncated = true;

      const nodeIds = new Set(nodes.map((n) => n.id));
      for (let i = edges.length - 1; i >= 0; i--) {
        if (!nodeIds.has(edges[i].source) || !nodeIds.has(edges[i].target)) {
          edges.splice(i, 1);
        }
      }
    }

    const graphData: ProductGraphData = {
      nodes,
      edges,
      quality: 1, // Understanding engines produce quality=1 (no scoring in Sprint 2B)
      truncated,
      metadata: {
        url,
        depth,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        builtAt: new Date().toISOString(),
        version: "2.0.0",
        routeCount: routeGraph.routeCount,
        componentCount: componentMap.components.length,
        flowCount: flows.flows.length,
        detectionMethods: ["semantic_tag", "aria_role", "class_pattern", "structural_heuristic", "element_pattern"],
      },
    };

    // Emit build complete
    emitGraphBuildComplete(investigationId, nodes.length, edges.length);

    // Persist via existing repository
    await investigationRepo.saveGraph(investigationId, {
      nodes,
      edges: edges.map(e => ({ ...e, metadata: e.metadata ?? {} })),
      quality: graphData.quality,
      truncated,
      metadata: graphData.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const duration = Date.now() - startTime;
    logger.info("Product graph built", {
      investigationId,
      nodes: nodes.length,
      edges: edges.length,
      duration,
    });

    return graphData;
  }
}
