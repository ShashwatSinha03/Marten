import type { InvestigationContext } from "../types";
import type { EvidenceBundle } from "@/lib/pipeline/types";
import type {
  StructuredDom,
  NetworkSummary,
  NavigationHistory,
} from "@/lib/evidence/types";
import type {
  RouteGraph,
  ComponentMap,
  NavigationGraphData,
  FlowGraphData,
} from "@/lib/understanding/types";

/**
 * Create a minimal InvestigationContext for testing with sensible defaults.
 */
export function createMockContext(
  overrides?: Partial<InvestigationContext>,
): InvestigationContext {
  return {
    investigationId: "test-inv-001",
    evidence: {
      screenshots: [],
      domSnapshots: [],
      networkLogs: [],
      consoleLogs: [],
    },
    graph: {
      nodes: [],
      edges: [],
      quality: 1,
      truncated: false,
      metadata: {
        url: "https://example.com",
        depth: "quick",
        nodeCount: 0,
        edgeCount: 0,
        builtAt: new Date().toISOString(),
        version: "2.0.0",
      },
    },
    url: "https://example.com",
    depth: "standard",
    ...overrides,
  };
}

/**
 * Create a mock StructuredDom for testing.
 */
export function createMockDom(
  overrides?: Partial<StructuredDom>,
): StructuredDom {
  return {
    title: "Test Page",
    url: "https://example.com",
    metaDescription: "A test page description",
    metaKeywords: [],
    canonicalUrl: null,
    headings: [],
    links: [],
    buttons: [],
    forms: [],
    inputs: [],
    images: [],
    scripts: [],
    stylesheets: [],
    textContent: { totalCharacters: 0, wordCount: 0, paragraphs: 0 },
    performance: { domContentLoadedMs: 0, loadEventMs: 0, domNodes: 0 },
    ...overrides,
  };
}

/**
 * Create a mock navigation history for testing.
 */
export function createMockNavigationHistory(
  overrides?: Partial<NavigationHistory>,
): NavigationHistory {
  return {
    entries: [],
    totalDurationMs: 0,
    pageCount: 0,
    redirectCount: 0,
    ...overrides,
  };
}

/**
 * Create a mock network summary for testing.
 */
export function createMockNetworkSummary(
  overrides?: Partial<NetworkSummary>,
): NetworkSummary {
  return {
    totalRequests: 0,
    totalBytes: 0,
    totalTimeMs: 0,
    byType: {},
    byStatusCode: {},
    slowestRequests: [],
    largestRequests: [],
    failedRequests: [],
    blockedRequests: [],
    thirdParty: { total: 0, byDomain: {} },
    ...overrides,
  };
}

export function createMockRouteGraph(
  overrides?: Partial<RouteGraph>,
): RouteGraph {
  return {
    routes: new Map(),
    rootPath: "/",
    routeCount: 0,
    ...overrides,
  };
}

export function createMockComponentMap(
  overrides?: Partial<ComponentMap>,
): ComponentMap {
  return {
    components: [],
    byKind: new Map(),
    byRoute: new Map(),
    ...overrides,
  };
}

export function createMockNavigationGraph(
  overrides?: Partial<NavigationGraphData>,
): NavigationGraphData {
  return {
    nodes: [],
    edges: [],
    navigationSequence: [],
    rootPath: "/",
    ...overrides,
  };
}

export function createMockFlowData(
  overrides?: Partial<FlowGraphData>,
): FlowGraphData {
  return {
    flows: [],
    mainFlow: null,
    ...overrides,
  };
}

// ── Assertion helper for tests ──────────────────────────────────────

let passed = 0;
let failed = 0;

export function resetCounters(): void {
  passed = 0;
  failed = 0;
}

export function assert(
  condition: boolean,
  label: string,
): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

export function summary(): void {
  const total = passed + failed;
  console.log(`\nResults: ${passed}/${total} passed`);
  if (failed > 0) {
    console.error(`  ${failed} test(s) FAILED`);
  }
}
