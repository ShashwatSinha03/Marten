// Test: console-detector
// Run: npx tsx src/lib/investigation/__tests__/console-detector.test.ts

import "../detectors/console-detector";
import { detectorRegistry } from "../detector-registry";
import { createMockContext, assert, resetCounters, summary } from "./helpers";
import type { EvidenceItem } from "@/types";

function makeConsoleLog(entries: Array<{ level: string; message: string; source: string }>): EvidenceItem {
  return {
    id: "console-001",
    type: "console_log",
    storageKey: "test",
    mimeType: "application/json",
    size: 100,
    metadata: { entries },
    createdAt: new Date().toISOString(),
  };
}

export async function runConsoleTests(): Promise<void> {
  resetCounters();

  // ── Positive: JS errors detected ──
  {
    const log = makeConsoleLog([
      { level: "error", message: "Uncaught TypeError: Cannot read property", source: "app.js" },
    ]);
    const ctx = createMockContext({
      evidence: { screenshots: [], domSnapshots: [], networkLogs: [], consoleLogs: [log] },
    });
    const result = await detectorRegistry.execute("console", ctx);
    const errorFindings = result.findings.filter((f) => f.ruleId === "console/js-error");
    assert(errorFindings.length > 0, "js-error: detects console errors");
  }

  // ── Negative: no errors ──
  {
    const log = makeConsoleLog([
      { level: "info", message: "App initialized", source: "app.js" },
    ]);
    const ctx = createMockContext({
      evidence: { screenshots: [], domSnapshots: [], networkLogs: [], consoleLogs: [log] },
    });
    const result = await detectorRegistry.execute("console", ctx);
    const errorFindings = result.findings.filter((f) => f.ruleId === "console/js-error");
    assert(errorFindings.length === 0, "js-error: no finding when no errors");
  }

  // ── Positive: excessive warnings ──
  {
    const log = makeConsoleLog(
      Array.from({ length: 6 }, (_, i) => ({
        level: "warning",
        message: `Deprecated API used (${i})`,
        source: "vendor.js",
      })),
    );
    const ctx = createMockContext({
      evidence: { screenshots: [], domSnapshots: [], networkLogs: [], consoleLogs: [log] },
    });
    const result = await detectorRegistry.execute("console", ctx);
    const warnFindings = result.findings.filter((f) => f.ruleId === "console/excessive-warning");
    assert(warnFindings.length > 0, "excessive-warning: detects 5+ warnings from same source");
  }

  // ── Positive: failed resource ──
  {
    const log = makeConsoleLog([
      { level: "error", message: "Failed to load resource: the server responded with 404", source: "chunk.js" },
    ]);
    const ctx = createMockContext({
      evidence: { screenshots: [], domSnapshots: [], networkLogs: [], consoleLogs: [log] },
    });
    const result = await detectorRegistry.execute("console", ctx);
    const resourceFindings = result.findings.filter((f) => f.ruleId === "console/failed-resource");
    assert(resourceFindings.length > 0, "failed-resource: detects resource loading errors");
  }

  // ── Edge case: empty logs ──
  {
    const log = makeConsoleLog([]);
    const ctx = createMockContext({
      evidence: { screenshots: [], domSnapshots: [], networkLogs: [], consoleLogs: [log] },
    });
    const result = await detectorRegistry.execute("console", ctx);
    assert(result.findings.length === 0, "console: empty logs produce no findings");
  }

  // ── Determinism ──
  {
    const log = makeConsoleLog([
      { level: "error", message: "Test error", source: "test.js" },
    ]);
    const ctx = createMockContext({
      evidence: { screenshots: [], domSnapshots: [], networkLogs: [], consoleLogs: [log] },
    });
    const r1 = await detectorRegistry.execute("console", ctx);
    const r2 = await detectorRegistry.execute("console", ctx);
    assert(r1.findings.length === r2.findings.length, "console: deterministic");
  }

  summary();
}

runConsoleTests().catch(console.error);
