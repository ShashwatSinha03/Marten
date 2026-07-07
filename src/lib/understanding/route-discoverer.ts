import type { NavigationHistory } from "@/lib/evidence/types";
import type { StructuredDom } from "@/lib/evidence/types";
import type { DiscoveredRoute, RouteGraph } from "./types";

/**
 * RouteDiscoverer analyzes navigation history and DOM links to
 * discover the route structure of the investigated application.
 */
export class RouteDiscoverer {
  /**
   * Discover routes from navigation history and DOM link analysis.
   */
  discoverRoutes(
    navigationHistory: NavigationHistory,
    structuredDom: StructuredDom,
    rootUrl: string,
  ): RouteGraph {
    const baseDomain = this.#extractDomain(rootUrl);
    const routeMap = new Map<string, DiscoveredRoute>();

    // Step 1: Extract routes from navigation history
    for (const entry of navigationHistory.entries) {
      const path = this.#normalizePath(entry.url, baseDomain);
      if (!path) continue;

      const existing = routeMap.get(path);
      if (existing) {
        existing.visitCount += 1;
        existing.totalTimingMs += entry.durationMs;
        if (entry.statusCode) existing.statusCode = entry.statusCode;
      } else {
        routeMap.set(path, {
          path,
          url: entry.url,
          title: entry.title || structuredDom.title,
          depth: 0, // computed below
          isEntryPoint: routeMap.size === 0, // first visited = entry point
          isExitPoint: true, // will be updated after link analysis
          incomingLinks: [],
          outgoingLinks: [],
          visitCount: 1,
          totalTimingMs: entry.durationMs,
          statusCode: entry.statusCode || 200,
          internalRouteTargets: [],
        });
      }
    }

    if (routeMap.size === 0) {
      // Fallback: use the root URL itself
      const rootPath = this.#normalizePath(rootUrl, baseDomain) || "/";
      routeMap.set(rootPath, {
        path: rootPath,
        url: rootUrl,
        title: structuredDom.title,
        depth: 0,
        isEntryPoint: true,
        isExitPoint: true,
        incomingLinks: [],
        outgoingLinks: [],
        visitCount: 1,
        totalTimingMs: navigationHistory.totalDurationMs,
        statusCode: 200,
        internalRouteTargets: [],
      });
    }

    // Step 2: Analyze outgoing links from structured DOM
    for (const link of structuredDom.links) {
      if (!link.isInternal) continue;

      const targetPath = this.#normalizePath(link.href, baseDomain);
      if (!targetPath) continue;

      // Find which route this link belongs to (the current page's route)
      const currentUrl = navigationHistory.entries[navigationHistory.entries.length - 1]?.url || rootUrl;
      const sourcePath = this.#normalizePath(currentUrl, baseDomain) || "/";

      const source = routeMap.get(sourcePath);
      const target = routeMap.get(targetPath);

      if (source && !source.outgoingLinks.includes(targetPath)) {
        source.outgoingLinks.push(targetPath);
        source.isExitPoint = false;
      }

      if (target && !target.incomingLinks.includes(sourcePath)) {
        target.incomingLinks.push(sourcePath);
      }

      // Also discover routes from links that weren't navigated to
      if (!routeMap.has(targetPath)) {
        routeMap.set(targetPath, {
          path: targetPath,
          url: link.href,
          title: "",
          depth: Infinity,
          isEntryPoint: false,
          isExitPoint: true,
          incomingLinks: [sourcePath],
          outgoingLinks: [],
          visitCount: 0,
          totalTimingMs: 0,
          statusCode: 0,
          internalRouteTargets: [],
        });
      }

      if (source && !source.internalRouteTargets.includes(targetPath)) {
        source.internalRouteTargets.push(targetPath);
      }
    }

    // Step 3: Compute depths via BFS from root
    const rootPath = this.#findRootPath(routeMap, baseDomain);
    this.#computeDepths(routeMap, rootPath);

    // Step 4: Determine entry/exit points
    for (const [, route] of routeMap) {
      route.isEntryPoint = route.isEntryPoint || route.incomingLinks.length === 0;
      route.isExitPoint = route.outgoingLinks.length === 0 && route.internalRouteTargets.length === 0;
    }

    return {
      routes: routeMap,
      rootPath,
      routeCount: routeMap.size,
    };
  }

  #normalizePath(url: string, baseDomain: string): string | null {
    try {
      const parsed = new URL(url, `https://${baseDomain}`);
      // Skip external domains
      if (!parsed.hostname.endsWith(baseDomain) && !baseDomain.endsWith(parsed.hostname)) {
        return null;
      }
      // Skip non-http protocols
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
      }
      // Return pathname only (strip query, hash)
      return parsed.pathname.replace(/\/$/, "") || "/";
    } catch {
      return null;
    }
  }

  #extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  }

  #findRootPath(routeMap: Map<string, DiscoveredRoute>, baseDomain: string): string {
    // The visited route with the most incoming links or the first visited
    let root = "/";
    let maxIncoming = -1;
    for (const [path, route] of routeMap) {
      if (route.visitCount > 0 && route.incomingLinks.length > maxIncoming) {
        maxIncoming = route.incomingLinks.length;
        root = path;
      }
    }
    return root;
  }

  #computeDepths(routeMap: Map<string, DiscoveredRoute>, rootPath: string): void {
    const visited = new Set<string>();
    const queue: Array<{ path: string; depth: number }> = [{ path: rootPath, depth: 0 }];

    while (queue.length > 0) {
      const { path, depth } = queue.shift()!;
      if (visited.has(path)) continue;
      visited.add(path);

      const route = routeMap.get(path);
      if (!route) continue;
      route.depth = Math.min(route.depth, depth);

      for (const target of route.internalRouteTargets) {
        if (!visited.has(target)) {
          queue.push({ path: target, depth: depth + 1 });
        }
      }
      for (const target of route.outgoingLinks) {
        if (!visited.has(target)) {
          queue.push({ path: target, depth: depth + 1 });
        }
      }
    }
  }
}
