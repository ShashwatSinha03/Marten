// Test: form-detector
// Run: npx tsx src/lib/investigation/__tests__/form-detector.test.ts

import "../detectors/form-detector";
import { detectorRegistry } from "../detector-registry";
import { createMockContext, createMockDom, assert, resetCounters, summary } from "./helpers";

export async function runFormTests(): Promise<void> {
  resetCounters();

  // Positive: missing submit button
  {
    const dom = createMockDom({
      forms: [{ action: "/submit", method: "POST", inputs: 3, submits: 0 }],
    });
    const ctx = createMockContext({ structuredDom: dom });
    const result = await detectorRegistry.execute("form", ctx);
    assert(result.findings.some(f => f.ruleId === "form/missing-submit"), "missing-submit: form with no submit detected");
  }

  // Negative: form with submit button
  {
    const dom = createMockDom({
      forms: [{ action: "/submit", method: "POST", inputs: 3, submits: 1 }],
    });
    const ctx = createMockContext({ structuredDom: dom });
    const result = await detectorRegistry.execute("form", ctx);
    assert(result.findings.filter(f => f.ruleId === "form/missing-submit").length === 0, "missing-submit: no false positive");
  }

  // Positive: excessive required fields
  {
    const dom = createMockDom({
      inputs: Array.from({ length: 7 }, (_, i) => ({
        type: "text", name: `field${i}`, placeholder: "", required: true,
      })),
    });
    const ctx = createMockContext({ structuredDom: dom });
    const result = await detectorRegistry.execute("form", ctx);
    assert(result.findings.some(f => f.ruleId === "form/excessive-required"), "excessive-required: 7 required fields detected");
  }

  // Positive: oversized form
  {
    const dom = createMockDom({
      inputs: Array.from({ length: 12 }, (_, i) => ({
        type: "text", name: `field${i}`, placeholder: "", required: false,
      })),
    });
    const ctx = createMockContext({ structuredDom: dom });
    const result = await detectorRegistry.execute("form", ctx);
    assert(result.findings.some(f => f.ruleId === "form/oversized-form"), "oversized-form: 12 inputs detected");
  }

  // Edge: empty structuredDom
  {
    const ctx = createMockContext({ structuredDom: undefined });
    const result = await detectorRegistry.execute("form", ctx);
    assert(result.findings.length === 0, "form: no structuredDom handled");
  }

  // Determinism
  {
    const dom = createMockDom({
      forms: [{ action: "/api", method: "POST", inputs: 2, submits: 0 }],
    });
    const ctx = createMockContext({ structuredDom: dom });
    const r1 = await detectorRegistry.execute("form", ctx);
    const r2 = await detectorRegistry.execute("form", ctx);
    assert(r1.findings.length === r2.findings.length, "form: deterministic");
  }

  summary();
}

runFormTests().catch(console.error);
