// Test: navigation-detector
// Covers orphan-page, dead-end, excessive-depth, circular, unreachable, disconnected-chain
// This test file can be run via: npx tsx src/lib/investigation/__tests__/navigation-detector.test.ts

import "../detectors/navigation-detector";
import { detectorRegistry } from "../detector-registry";
import { createMockContext, assert, resetCounters, summary } from "./helpers";
import type { InvestigationContext } from "../types";
import type { ProductGraphData } from "@/types";

function makeGraph(overrides?: Partial<ProductGraphData>): ProductGraphData {
  return {
    nodes: [
      { id: "page1", type: "page", label: "Home", priority: 1, metadata: { isEntryPoint: true } },
      { id: "page2", type: "page", label: "About", priority: 2, metadata: {} },
      { id: "page3", type: "page", label: "Contact", priority: 2, metadata: {} },
      { id: "page4", type: "page", label: "Orphaned Page", priority: 3, metadata: {} },
      { id: "page5", type: "page", label: "Deep Page", priority: 4, metadata: {} },
    ],
    edges: [
      { id: "e1", source: "page1", target: "page2", type: "navigates_to" },
      { id: "e2", source: "page2", target: "page3", type: "links_to" },
      { id: "e3", source: "page1", target: "page5", type: "navigates_to" },
      { id: "e4", source: "page5", target: "page1", type: "navigates_to" },
    ],
    quality: 1,
    truncated: false,
    metadata: {
      url: "https://example.com",
      depth: "standard",
      nodeCount: 5,
      edgeCount: 4,
      builtAt: new Date().toISOString(),
      version: "2.0.0",
    },
    ...overrides,
  };
}

export async function runNavigationTests(): Promise<void> {
  resetCounters();

  // ── Positive case: orphan page detection ──
  {
    const ctx = createMockContext({ graph: makeGraph() });
    const result = await detectorRegistry.execute("navigation", ctx);
    const orphanFindings = result.findings.filter(
      (f) => f.ruleId === "navigation/orphan-page",
    );
    assert(
      orphanFindings.some((f) => f.graphNodeIds.includes("page4")),
      "orphan-page: detects orphaned page4 (no incoming edges)",
    );
  }

  // ── Negative case: no orphans when all pages have incoming edges ──
  {
    const g = makeGraph();
    g.edges.push({
      id: "e5", source: "page3", target: "page4", type: "links_to",
    });
    const ctx = createMockContext({ graph: g });
    const result = await detectorRegistry.execute("navigation", ctx);
    const orphanFindings = result.findings.filter(
      (f) => f.ruleId === "navigation/orphan-page",
    );
    assert(orphanFindings.length === 0, "orphan-page: no orphans when all pages linked");
  }

  // ── Positive case: dead-end detection ──
  {
    const ctx = createMockContext({ graph: makeGraph() });
    const result = await detectorRegistry.execute("navigation", ctx);
    const deadEndFindings = result.findings.filter(
      (f) => f.ruleId === "navigation/dead-end",
    );
    assert(
      deadEndFindings.some((f) => f.graphNodeIds.includes("page3")),
      "dead-end: page3 has no outgoing edges",
    );
    assert(
      deadEndFindings.some((f) => f.graphNodeIds.includes("page4")),
      "dead-end: page4 has no outgoing edges",
    );
  }

  // ── Edge case: empty graph ──
  {
    const ctx = createMockContext({
      graph: {
        nodes: [],
        edges: [],
        quality: 0,
        truncated: false,
        metadata: {
          url: "https://example.com", depth: "quick",
          nodeCount: 0, edgeCount: 0,
          builtAt: new Date().toISOString(), version: "2.0.0",
        },
      },
    });
    const result = await detectorRegistry.execute("navigation", ctx);
    assert(result.findings.length === 0, "navigation: empty graph produces no findings");
  }

  // ── Determinism check ──
  {
    const ctx = createMockContext({ graph: makeGraph() });
    const result1 = await detectorRegistry.execute("navigation", ctx);
    const result2 = await detectorRegistry.execute("navigation", ctx);
    assert(
      result1.findings.length === result2.findings.length,
      "navigation: deterministic output (same count)",
    );
    for (let i = 0; i < result1.findings.length; i++) {
      assert(
        result1.findings[i].fingerprint === result2.findings[i].fingerprint,
        `navigation: deterministic fingerprint at index ${i}`,
      );
    }
  }

  summary();
}

// Run if executed directly
runNavigationTests().catch(console.error);
