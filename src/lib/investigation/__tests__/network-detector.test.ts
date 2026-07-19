// Test: network-detector
// Run: npx tsx src/lib/investigation/__tests__/network-detector.test.ts

import "../detectors/network-detector";
import { detectorRegistry } from "../detector-registry";
import { createMockContext, assert, resetCounters, summary } from "./helpers";
import type { EvidenceItem } from "@/types";

function makeNetworkLog(entries: Array<{ url: string; method: string; status: number; type: string; timing: number }>): EvidenceItem {
  return {
    id: "net-001",
    type: "network_log",
    storageKey: "test",
    mimeType: "application/json",
    size: 100,
    metadata: { entries },
    createdAt: new Date().toISOString(),
  };
}

export async function runNetworkTests(): Promise<void> {
  resetCounters();

  // Positive: failed requests
  {
    const log = makeNetworkLog([
      { url: "https://example.com/api/data", method: "GET", status: 500, type: "fetch", timing: 200 },
    ]);
    const ctx = createMockContext({
      evidence: { screenshots: [], domSnapshots: [], networkLogs: [log], consoleLogs: [] },
    });
    const result = await detectorRegistry.execute("network", ctx);
    assert(result.findings.some(f => f.ruleId === "network/failed-request"), "failed-request: 5xx detected");
  }

  // Negative: all 200s
  {
    const log = makeNetworkLog([
      { url: "https://example.com/", method: "GET", status: 200, type: "document", timing: 100 },
    ]);
    const ctx = createMockContext({
      evidence: { screenshots: [], domSnapshots: [], networkLogs: [log], consoleLogs: [] },
    });
    const result = await detectorRegistry.execute("network", ctx);
    assert(result.findings.filter(f => f.ruleId === "network/failed-request").length === 0, "failed-request: no false positive on 200");
  }

  // Positive: slow resource
  {
    const log = makeNetworkLog([
      { url: "https://example.com/slow", method: "GET", status: 200, type: "fetch", timing: 5000 },
    ]);
    const ctx = createMockContext({
      evidence: { screenshots: [], domSnapshots: [], networkLogs: [log], consoleLogs: [] },
    });
    const result = await detectorRegistry.execute("network", ctx);
    assert(result.findings.some(f => f.ruleId === "network/slow-resource"), "slow-resource: >3s detected");
  }

  // Edge: empty logs
  {
    const ctx = createMockContext({
      evidence: { screenshots: [], domSnapshots: [], networkLogs: [], consoleLogs: [] },
    });
    const result = await detectorRegistry.execute("network", ctx);
    assert(result.findings.length === 0, "network: empty logs produce no findings");
  }

  // Determinism
  {
    const log = makeNetworkLog([
      { url: "https://example.com/api", method: "GET", status: 404, type: "fetch", timing: 100 },
    ]);
    const ctx = createMockContext({
      evidence: { screenshots: [], domSnapshots: [], networkLogs: [log], consoleLogs: [] },
    });
    const r1 = await detectorRegistry.execute("network", ctx);
    const r2 = await detectorRegistry.execute("network", ctx);
    assert(r1.findings.length === r2.findings.length, "network: deterministic");
  }

  summary();
}

runNetworkTests().catch(console.error);
