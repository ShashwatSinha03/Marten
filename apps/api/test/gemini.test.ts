import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeEvidence } from "../src/gemini.js";
const evidence = [
  {
    id: "page-1",
    url: "https://fixture.marten.test",
    status: 404,
    capturedAt: "now",
    text: "Missing page",
    links: [],
    screenshotSha256: "abc",
  },
];
test("Gemini sends BYOK only in header and validates structured citations", async (context) => {
  context.mock.method(
    globalThis,
    "fetch",
    async (url: unknown, init: RequestInit) => {
      assert.match(
        String(url),
        /^https:\/\/generativelanguage.googleapis.com\/v1beta\/models\/gemini-/,
      );
      assert.equal(
        (init.headers as Record<string, string>)["x-goog-api-key"],
        "private-key",
      );
      assert.ok(!String(init.body).includes("private-key"));
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      summary: "Missing route observed.",
                      limitations: [],
                      findings: [
                        {
                          id: "f1",
                          title: "Missing route",
                          observation: "404 response",
                          impact: "Cannot load route",
                          recommendation: "Restore route",
                          kind: "observed",
                          severity: "high",
                          evidenceIds: ["page-1"],
                        },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      );
    },
  );
  const report = await analyzeEvidence(
    evidence,
    "check route",
    "private-key",
    new AbortController().signal,
  );
  assert.equal(report.findings[0].evidenceIds[0], "page-1");
});
test("Gemini quota responses never propagate provider body or key", async (context) => {
  context.mock.method(
    globalThis,
    "fetch",
    async () => new Response("sensitive-provider-body", { status: 429 }),
  );
  await assert.rejects(
    analyzeEvidence(evidence, "", "private-key", new AbortController().signal),
    { message: "PROVIDER_QUOTA" },
  );
});

test("grounded navigation checks cite source and destination, with no healthy or timeout false positives", async () => {
  const { deriveNavigationFindings } = await import("../src/gemini.js");
  const source = { ...evidence[0], id: "source", status: 200, url: "https://fixture.marten.test/", links: ["https://fixture.marten.test/missing#details", "https://fixture.marten.test/hang"] };
  const missing = { ...evidence[0], id: "missing", url: "https://fixture.marten.test/missing" };
  const findings = deriveNavigationFindings([source, missing]);
  assert.equal(findings.length, 1);
  assert.deepEqual(findings[0].evidenceIds, ["source", "missing"]);
  assert.equal(findings[0].reproduction?.length, 2);
  assert.ok(findings[0].uncertainty);
  assert.equal(deriveNavigationFindings([source, { ...missing, status: 200 }]).length, 0);
  assert.equal(deriveNavigationFindings([source]).length, 0);
  assert.equal(deriveNavigationFindings([missing]).length, 0);
});

test("optional reproduction and uncertainty are bounded and legacy reports remain valid", async () => {
  const { validateReport } = await import("../src/gemini.js");
  const finding = { id: "f", title: "t", observation: "o", impact: "i", recommendation: "r", kind: "observed", severity: "low", evidenceIds: ["page-1"], reproduction: ["Open the captured URL"], uncertainty: "Single capture" };
  const report = { summary: "Summary", findings: [finding], limitations: [] };
  assert.deepEqual(validateReport(report, evidence).findings[0].reproduction, finding.reproduction);
  assert.throws(() => validateReport({ ...report, findings: [{ ...finding, reproduction: new Array(9).fill("step") }] }, evidence), /INVALID_REPORT/);
});

test("grounding adds confirmed navigation failure and keeps interpretations without duplicate IDs", async () => {
  const { groundReport } = await import("../src/gemini.js");
  const source = { ...evidence[0], id: "source", status: 200, links: ["https://fixture.marten.test/missing"] };
  const destination = { ...evidence[0], url: "https://fixture.marten.test/missing" };
  const report = groundReport({ summary: "Summary", limitations: [], findings: [] }, [source, destination]);
  assert.equal(report.findings.length, 1);
  assert.equal(report.findings[0].kind, "observed");
  assert.equal(groundReport(report, [source, destination]).findings.length, 1);
});

test("grounding preserves model interpretations and rejects fabricated evidence", async () => {
  const { groundReport } = await import("../src/gemini.js");
  const interpretation = { id: "model-1", title: "Review the wording", observation: "Captured wording may be unclear", impact: "May confuse readers", recommendation: "Review the wording", kind: "interpretation" as const, severity: "low" as const, evidenceIds: ["page-1"] };
  const report = { summary: "Summary", limitations: [], findings: [interpretation] };
  assert.deepEqual(groundReport(report, evidence).findings, [interpretation]);
  assert.throws(() => groundReport({ ...report, findings: [{ ...interpretation, evidenceIds: ["foreign-page"] }] }, evidence), /INVALID_REPORT/);
});
