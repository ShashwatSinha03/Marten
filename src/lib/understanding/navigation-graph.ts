import type { NavigationHistory } from "@/lib/evidence/types";
import type { RouteGraph } from "./types";
import type { NavigationGraphData, NavigationNode, NavigationEdge } from "./types";

/**
 * NavigationGraphBuilder constructs a directed navigation graph
 * tracking routes, transitions, visit frequency, and timing.
 */
export class NavigationGraphBuilder {
  /**
   * Build a navigation graph from discovered routes and navigation history.
   */
  buildNavigationGraph(
    routeGraph: RouteGraph,
    navigationHistory: NavigationHistory,
  ): NavigationGraphData {
    const nodeMap = new Map<string, NavigationNode>();
    const edgeMap = new Map<string, NavigationEdge>();
    const navigationSequence: string[] = [];
    let entryOrder = 0;

    // Step 1: Create nodes from discovered routes
    for (const [, route] of routeGraph.routes) {
      nodeMap.set(route.path, {
        routePath: route.path,
        title: route.title,
        visitCount: route.visitCount,
        entryOrder: route.isEntryPoint ? entryOrder++ : Infinity,
        isEntryPoint: route.isEntryPoint,
        isExitPoint: route.isExitPoint,
        averageLoadTimeMs: route.visitCount > 0
          ? Math.round(route.totalTimingMs / route.visitCount)
          : 0,
        statusCodes: route.statusCode ? [route.statusCode] : [],
      });
    }

    // Step 2: Build edges from navigation history
    for (let i = 0; i < navigationHistory.entries.length - 1; i++) {
      const from = this.#normalizeEntryPath(navigationHistory.entries[i].url);
      const to = this.#normalizeEntryPath(navigationHistory.entries[i + 1].url);

      if (!from || !to || from === to) continue; // skip self-navigation

      navigationSequence.push(from);

      const edgeKey = `${from}→${to}`;
      const existing = edgeMap.get(edgeKey);

      if (existing) {
        existing.frequency += 1;
        existing.meanTransitionMs = Math.round(
          (existing.meanTransitionMs * (existing.frequency - 1) + navigationHistory.entries[i + 1].durationMs) /
          existing.frequency
        );
      } else {
        edgeMap.set(edgeKey, {
          sourcePath: from,
          targetPath: to,
          frequency: 1,
          sequenceOrder: i,
          linkText: null,
          meanTransitionMs: navigationHistory.entries[i + 1].durationMs,
        });
      }
    }

    // Add last entry to sequence
    const lastEntry = navigationHistory.entries[navigationHistory.entries.length - 1];
    if (lastEntry) {
      const lastPath = this.#normalizeEntryPath(lastEntry.url);
      if (lastPath) navigationSequence.push(lastPath);
    }

    // Step 3: Create link-text edges from route graph
    // (links_to edges are separate from navigates_to edges)

    return {
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values()),
      navigationSequence,
      rootPath: routeGraph.rootPath,
    };
  }

  #normalizeEntryPath(url: string): string | null {
    try {
      const parsed = new URL(url);
      return parsed.pathname.replace(/\/$/, "") || "/";
    } catch {
      return null;
    }
  }
}
