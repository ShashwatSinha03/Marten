import { test } from "node:test";
import assert from "node:assert/strict";
import { logStartupProbe } from "../src/startup.js";
test("startup probe emits measurements without raw evidence or error content", () => {
  const lines: string[] = [];
  logStartupProbe(
    {
      state: "partial",
      elapsedMs: 10,
      peakNodeRssBytes: 100,
      peakProcessTreeRssBytes: 200,
      browserClosed: true,
      chromiumSandbox: true,
      blockedRequests: 1,
      offOriginRequestsReceived: 0,
      pages: [{ text: "private" }],
      error: "private",
    },
    (line) => lines.push(line),
  );
  const result = JSON.parse(lines[0]);
  assert.equal(result.probe.peakProcessTreeRssBytes, 200);
  assert.equal(result.probe.state, "partial");
  assert.equal(lines.length, 1);
  assert.ok(!lines[0].includes("private"));
});
