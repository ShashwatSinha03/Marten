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
