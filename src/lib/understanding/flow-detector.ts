import type { NavigationGraphData, NavigationNode, NavigationEdge, AppFlow, FlowGraphData } from "./types";
import type { NavigationHistory } from "@/lib/evidence/types";

/**
 * FlowDetector identifies application flows by analyzing the
 * directed navigation graph and navigation history.
 */
export class FlowDetector {
  private flowCounter = 0;

  /**
   * Detect application flows from the navigation graph.
   */
  detectFlows(
    navigationGraph: NavigationGraphData,
    navigationHistory: NavigationHistory,
  ): FlowGraphData {
    this.flowCounter = 0;

    // Build adjacency list
    const adjacency = new Map<string, string[]>();
    for (const node of navigationGraph.nodes) {
      adjacency.set(node.routePath, []);
    }
    for (const edge of navigationGraph.edges) {
      const targets = adjacency.get(edge.sourcePath);
      if (targets) {
        targets.push(edge.targetPath);
      }
    }

    // Find entry points (nodes with no incoming edges)
    const hasIncoming = new Set<string>();
    for (const edge of navigationGraph.edges) {
      hasIncoming.add(edge.targetPath);
    }
    const entryPoints = navigationGraph.nodes
      .filter(n => !hasIncoming.has(n.routePath) || n.isEntryPoint)
      .map(n => n.routePath);

    // If no entry points found, use rootPath
    const startPoints = entryPoints.length > 0 ? entryPoints : [navigationGraph.rootPath];

    // DFS from each entry point to discover flows
    const allPaths: string[][] = [];
    const visited = new Set<string>();

    const dfs = (current: string, path: string[]) => {
      const neighbors = adjacency.get(current) ?? [];
      if (neighbors.length === 0 || path.length > 20) {
        // Terminal node or max depth
        allPaths.push([...path]);
        return;
      }

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          path.push(neighbor);
          dfs(neighbor, path);
          path.pop();
          visited.delete(neighbor);
        } else {
          // Cycle detected — record the path up to this point
          allPaths.push([...path]);
        }
      }
    };

    for (const start of startPoints) {
      visited.add(start);
      dfs(start, [start]);
      visited.delete(start);
    }

    // Deduplicate and merge overlapping paths
    const mergedFlows = this.#mergeFlows(allPaths, navigationGraph, navigationHistory);

    // Find main flow (longest, most-traversed)
    const mainFlow = mergedFlows.length > 0
      ? mergedFlows.reduce((a, b) => (a.depth >= b.depth ? a : b))
      : null;

    return { flows: mergedFlows, mainFlow };
  }

  #mergeFlows(
    paths: string[][],
    navGraph: NavigationGraphData,
    navHistory: NavigationHistory,
  ): AppFlow[] {
    // Sort by length (descending), take top unique paths
    const unique = new Set<string>();
    const flows: AppFlow[] = [];

    const sorted = [...paths].sort((a, b) => b.length - a.length);

    for (const path of sorted) {
      const key = path.join("→");
      if (unique.has(key)) continue;
      unique.add(key);

      if (path.length < 2) continue; // skip trivial single-page paths

      this.flowCounter++;
      const pageTitles = path.map(p => {
        const node = navGraph.nodes.find(n => n.routePath === p);
        return node?.title || p;
      });

      // Compute total duration
      let totalDurationMs = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const edge = navGraph.edges.find(e => e.sourcePath === path[i] && e.targetPath === path[i + 1]);
        if (edge) totalDurationMs += edge.meanTransitionMs;
      }

      // Check for branching
      const adjList = new Map<string, string[]>();
      for (const edge of navGraph.edges) {
        const targets = adjList.get(edge.sourcePath) ?? [];
        targets.push(edge.targetPath);
        adjList.set(edge.sourcePath, targets);
      }
      const hasBranching = path.some(p => (adjList.get(p)?.length ?? 0) > 1);

      flows.push({
        id: `flow_${this.flowCounter}`,
        name: pageTitles.join(" → "),
        paths: path,
        entryPoint: path[0],
        exitPoint: path[path.length - 1],
        isComplete: true,
        isLinear: !hasBranching,
        branchingPaths: [],
        depth: path.length,
        totalDurationMs,
      });

      if (flows.length >= 10) break; // cap at 10 flows
    }

    return flows;
  }
}
