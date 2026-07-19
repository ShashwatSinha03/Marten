// Test: flow-detector
// Run: npx tsx src/lib/investigation/__tests__/flow-detector.test.ts

import "../detectors/flow-detector";
import { detectorRegistry } from "../detector-registry";
import { createMockContext, createMockFlowData, assert, resetCounters, summary } from "./helpers";

function makeMinimalGraph() {
  return {
    nodes: [],
    edges: [],
    quality: 1,
    truncated: false,
    metadata: {
      url: "https://example.com",
      depth: "standard" as const,
      nodeCount: 0,
      edgeCount: 0,
      builtAt: new Date().toISOString(),
      version: "2.0.0",
    },
  };
}

export async function runFlowTests(): Promise<void> {
  resetCounters();

  // Positive: incomplete flow
  {
    const flows = createMockFlowData({
      flows: [{
        id: "flow-1", name: "Sign Up", paths: ["/signup", "/verify"],
        entryPoint: "/signup", exitPoint: "",
        isComplete: false, isLinear: true,
        branchingPaths: [], depth: 1, totalDurationMs: 0,
      }],
    });
    const ctx = createMockContext({ flows, graph: makeMinimalGraph() });
    const result = await detectorRegistry.execute("flow", ctx);
    assert(result.findings.some(f => f.ruleId === "flow/incomplete-flow"), "incomplete-flow: detected");
  }

  // Negative: complete flow
  {
    const flows = createMockFlowData({
      flows: [{
        id: "flow-2", name: "Login", paths: ["/login", "/dashboard"],
        entryPoint: "/login", exitPoint: "/dashboard",
        isComplete: true, isLinear: true,
        branchingPaths: [], depth: 1, totalDurationMs: 0,
      }],
    });
    const ctx = createMockContext({ flows, graph: makeMinimalGraph() });
    const result = await detectorRegistry.execute("flow", ctx);
    assert(result.findings.filter(f => f.ruleId === "flow/incomplete-flow").length === 0, "incomplete-flow: no false positive");
  }

  // Edge: no flow data
  {
    const ctx = createMockContext({ flows: undefined });
    const result = await detectorRegistry.execute("flow", ctx);
    assert(result.findings.length === 0, "flow: no flows handled");
  }

  // Determinism
  {
    const flows = createMockFlowData({
      flows: [{
        id: "flow-3", name: "Test", paths: ["/a", "/b"],
        entryPoint: "/a", exitPoint: "",
        isComplete: false, isLinear: true,
        branchingPaths: [], depth: 1, totalDurationMs: 0,
      }],
    });
    const ctx = createMockContext({ flows, graph: makeMinimalGraph() });
    const r1 = await detectorRegistry.execute("flow", ctx);
    const r2 = await detectorRegistry.execute("flow", ctx);
    assert(r1.findings.length === r2.findings.length, "flow: deterministic");
  }

  summary();
}

runFlowTests().catch(console.error);
