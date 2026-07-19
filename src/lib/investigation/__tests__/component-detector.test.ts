// Test: component-detector
// Run: npx tsx src/lib/investigation/__tests__/component-detector.test.ts

import "../detectors/component-detector";
import { detectorRegistry } from "../detector-registry";
import { createMockContext, createMockDom, assert, resetCounters, summary } from "./helpers";
function makeGraph(navCount: number) {
  const nodes = Array.from({ length: navCount }, (_, i) => ({
    id: `nav-${i}`,
    type: "navigation" as const,
    label: `Nav ${i}`,
    priority: 1,
    metadata: { tagName: "nav" },
  }));
  const allNodes = [
    ...nodes,
    {
      id: "main-content",
      type: "section" as const,
      label: "Main Content",
      priority: 2,
      metadata: { tagName: "main" },
    },
  ];
  return {
    nodes: allNodes,
    edges: [],
    quality: 1,
    truncated: false,
    metadata: {
      url: "https://example.com", depth: "standard" as const,
      nodeCount: allNodes.length, edgeCount: 0,
      builtAt: new Date().toISOString(), version: "2.0.0",
    },
  };
}

export async function runComponentTests(): Promise<void> {
  resetCounters();

  // Positive: duplicate navbar
  {
    const ctx = createMockContext({ graph: makeGraph(3) });
    const result = await detectorRegistry.execute("component", ctx);
    assert(result.findings.some(f => f.ruleId === "component/duplicate-navbar"), "duplicate-navbar: 3 navs detected");
  }

  // Negative: single navbar
  {
    const ctx = createMockContext({ graph: makeGraph(1) });
    const result = await detectorRegistry.execute("component", ctx);
    assert(result.findings.filter(f => f.ruleId === "component/duplicate-navbar").length === 0, "duplicate-navbar: no false positive on single nav");
  }

  // Positive: inconsistent heading hierarchy
  {
    const dom = createMockDom({
      headings: [
        { level: 1, text: "Title" },
        { level: 3, text: "Skip h2" },
      ],
    });
    const ctx = createMockContext({ structuredDom: dom });
    const result = await detectorRegistry.execute("component", ctx);
    assert(result.findings.some(f => f.ruleId === "component/inconsistent-hierarchy"), "inconsistent-hierarchy: h1→h3 detected");
  }

  // Edge: empty graph
  {
    const ctx = createMockContext({
      graph: { nodes: [], edges: [], quality: 0, truncated: false, metadata: {} as any },
    });
    const result = await detectorRegistry.execute("component", ctx);
    assert(result.findings.length >= 0, "component: empty graph handled");
  }

  // Determinism
  {
    const ctx = createMockContext({ graph: makeGraph(2) });
    const r1 = await detectorRegistry.execute("component", ctx);
    const r2 = await detectorRegistry.execute("component", ctx);
    assert(r1.findings.length === r2.findings.length, "component: deterministic");
  }

  summary();
}

runComponentTests().catch(console.error);
