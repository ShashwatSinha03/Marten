// Test: accessibility-detector (new rule-based detector)
// Run: npx tsx src/lib/investigation/__tests__/accessibility-detector.test.ts

import "../detectors/accessibility-detector";
import { detectorRegistry } from "../detector-registry";
import { createMockContext, createMockDom, assert, resetCounters, summary } from "./helpers";
import type { EvidenceItem } from "@/types";

function makeDomSnapshot(html: string): EvidenceItem {
  return {
    id: "dom-001",
    type: "dom_snapshot",
    storageKey: "test",
    mimeType: "text/html",
    size: html.length,
    metadata: { html },
    createdAt: new Date().toISOString(),
  };
}

export async function runAccessibilityTests(): Promise<void> {
  resetCounters();

  // ── Positive case: missing alt on img ──
  {
    const html = '<img src="photo.jpg"><img src="icon.png" alt="icon">';
    const ctx = createMockContext({
      evidence: {
        screenshots: [],
        domSnapshots: [makeDomSnapshot(html)],
        networkLogs: [],
        consoleLogs: [],
      },
    });
    const result = await detectorRegistry.execute("a11y", ctx);
    const altFindings = result.findings.filter((f) => f.ruleId === "a11y/missing-alt");
    assert(altFindings.length > 0, "missing-alt: detects images without alt attribute");
  }

  // ── Negative case: all images have alt ──
  {
    const html = '<img src="a.jpg" alt="A"><img src="b.jpg" alt="B">';
    const ctx = createMockContext({
      evidence: {
        screenshots: [], domSnapshots: [makeDomSnapshot(html)], networkLogs: [], consoleLogs: [],
      },
    });
    const result = await detectorRegistry.execute("a11y", ctx);
    const altFindings = result.findings.filter((f) => f.ruleId === "a11y/missing-alt");
    assert(altFindings.length === 0, "missing-alt: no violation when all images have alt");
  }

  // ── Positive case: duplicate IDs ──
  {
    const html = '<div id="foo"></div><span id="foo"></span>';
    const ctx = createMockContext({
      evidence: {
        screenshots: [], domSnapshots: [makeDomSnapshot(html)], networkLogs: [], consoleLogs: [],
      },
    });
    const result = await detectorRegistry.execute("a11y", ctx);
    const dupFindings = result.findings.filter((f) => f.ruleId === "a11y/duplicate-id");
    assert(dupFindings.length > 0, "duplicate-id: detects duplicate IDs");
  }

  // ── Positive case: unlabeled input ──
  {
    const html = '<input type="text" name="email">';
    const ctx = createMockContext({
      evidence: {
        screenshots: [], domSnapshots: [makeDomSnapshot(html)], networkLogs: [], consoleLogs: [],
      },
    });
    const result = await detectorRegistry.execute("a11y", ctx);
    const inputFindings = result.findings.filter((f) => f.ruleId === "a11y/unlabeled-input");
    assert(inputFindings.length > 0, "unlabeled-input: detects input without aria-label");
  }

  // ── Edge case: empty HTML ──
  {
    const ctx = createMockContext({
      evidence: {
        screenshots: [], domSnapshots: [makeDomSnapshot("")], networkLogs: [], consoleLogs: [],
      },
    });
    const result = await detectorRegistry.execute("a11y", ctx);
    assert(result.findings.length >= 0, "a11y: empty HTML produces no crash");
  }

  // ── Determinism ──
  {
    const html = '<img src="test.jpg"><input type="text">';
    const ctx = createMockContext({
      evidence: {
        screenshots: [], domSnapshots: [makeDomSnapshot(html)], networkLogs: [], consoleLogs: [],
      },
    });
    const r1 = await detectorRegistry.execute("a11y", ctx);
    const r2 = await detectorRegistry.execute("a11y", ctx);
    assert(r1.findings.length === r2.findings.length, "a11y: deterministic output");
  }

  summary();
}

runAccessibilityTests().catch(console.error);
