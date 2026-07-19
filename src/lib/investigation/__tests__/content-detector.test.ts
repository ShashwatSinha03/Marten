// Test: content-detector
// Run: npx tsx src/lib/investigation/__tests__/content-detector.test.ts

import "../detectors/content-detector";
import { detectorRegistry } from "../detector-registry";
import { createMockContext, createMockDom, assert, resetCounters, summary } from "./helpers";

export async function runContentTests(): Promise<void> {
  resetCounters();

  // Positive: missing title
  {
    const dom = createMockDom({ title: "" });
    const ctx = createMockContext({ structuredDom: dom });
    const result = await detectorRegistry.execute("content", ctx);
    assert(result.findings.some(f => f.ruleId === "content/missing-title"), "missing-title: empty title detected");
  }

  // Negative: valid title
  {
    const dom = createMockDom({ title: "Valid Page Title" });
    const ctx = createMockContext({ structuredDom: dom });
    const result = await detectorRegistry.execute("content", ctx);
    assert(result.findings.filter(f => f.ruleId === "content/missing-title").length === 0, "missing-title: no false positive");
  }

  // Positive: missing description
  {
    const dom = createMockDom({ metaDescription: "" });
    const ctx = createMockContext({ structuredDom: dom });
    const result = await detectorRegistry.execute("content", ctx);
    assert(result.findings.some(f => f.ruleId === "content/missing-description"), "missing-description: empty meta desc detected");
  }

  // Positive: placeholder text
  {
    const dom = createMockDom({
      headings: [{ level: 1, text: "Lorem Ipsum Dolor Sit Amet" }],
    });
    const ctx = createMockContext({ structuredDom: dom });
    const result = await detectorRegistry.execute("content", ctx);
    assert(result.findings.some(f => f.ruleId === "content/placeholder-text"), "placeholder-text: lorem ipsum detected");
  }

  // Positive: duplicated heading
  {
    const dom = createMockDom({
      headings: [
        { level: 2, text: "Features" },
        { level: 2, text: "Features" },
      ],
    });
    const ctx = createMockContext({ structuredDom: dom });
    const result = await detectorRegistry.execute("content", ctx);
    assert(result.findings.some(f => f.ruleId === "content/duplicated-heading"), "duplicated-heading: same heading twice detected");
  }

  // Edge: no structuredDom
  {
    const ctx = createMockContext({ structuredDom: undefined });
    const result = await detectorRegistry.execute("content", ctx);
    assert(result.findings.length === 0, "content: no structuredDom handled");
  }

  // Determinism
  {
    const dom = createMockDom({ title: "" });
    const ctx = createMockContext({ structuredDom: dom });
    const r1 = await detectorRegistry.execute("content", ctx);
    const r2 = await detectorRegistry.execute("content", ctx);
    assert(r1.findings.length === r2.findings.length, "content: deterministic");
  }

  summary();
}

runContentTests().catch(console.error);
