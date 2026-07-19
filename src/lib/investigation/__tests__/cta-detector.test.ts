// Test: cta-detector
// Run: npx tsx src/lib/investigation/__tests__/cta-detector.test.ts

import "../detectors/cta-detector";
import { detectorRegistry } from "../detector-registry";
import { createMockContext, createMockDom, assert, resetCounters, summary } from "./helpers";

export async function runCtaTests(): Promise<void> {
  resetCounters();

  // Positive: multiple primary CTAs
  {
    const dom = createMockDom({
      buttons: [
        { text: "Buy Now", selector: "btn-primary" },
        { text: "Sign Up", selector: "btn-primary" },
      ],
    });
    const ctx = createMockContext({ structuredDom: dom });
    const result = await detectorRegistry.execute("cta", ctx);
    assert(result.findings.some(f => f.ruleId === "cta/multiple-primary"), "multiple-primary: 2 primary buttons detected");
  }

  // Negative: single primary CTA
  {
    const dom = createMockDom({
      buttons: [{ text: "Buy Now", selector: "btn-primary" }],
    });
    const ctx = createMockContext({ structuredDom: dom });
    const result = await detectorRegistry.execute("cta", ctx);
    assert(result.findings.filter(f => f.ruleId === "cta/multiple-primary").length === 0, "multiple-primary: no false positive");
  }

  // Positive: no CTA
  {
    const dom = createMockDom({ buttons: [] });
    const ctx = createMockContext({ structuredDom: dom });
    const result = await detectorRegistry.execute("cta", ctx);
    assert(result.findings.some(f => f.ruleId === "cta/no-primary"), "no-primary: no buttons detected");
  }

  // Edge: null structuredDom
  {
    const ctx = createMockContext({ structuredDom: undefined });
    const result = await detectorRegistry.execute("cta", ctx);
    assert(result.findings.length === 0, "cta: no structuredDom produces no findings");
  }

  // Determinism
  {
    const dom = createMockDom({
      buttons: [{ text: "Go", selector: "btn-primary" }, { text: "Stop", selector: "btn" }],
    });
    const ctx = createMockContext({ structuredDom: dom });
    const r1 = await detectorRegistry.execute("cta", ctx);
    const r2 = await detectorRegistry.execute("cta", ctx);
    assert(r1.findings.length === r2.findings.length, "cta: deterministic");
  }

  summary();
}

runCtaTests().catch(console.error);
