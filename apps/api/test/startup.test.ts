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
      pages: [{ text: "private", status: 200 }, { status: 404 }],
      error: "private",
    },
    (line) => lines.push(line),
  );
  const result = JSON.parse(lines[0]);
  assert.equal(result.probe.peakProcessTreeRssBytes, 200);
  assert.equal(result.probe.state, "partial");
  assert.equal(result.probe.evidenceCount, 2);
  assert.deepEqual(result.probe.evidenceStatuses, [200, 404]);
  assert.equal(lines.length, 1);
  assert.ok(!lines[0].includes("private"));
});

test("startup labels sandbox as requested and includes safe fixture diagnostics", () => {
  const lines: string[] = [];
  logStartupProbe({ chromiumSandbox: true, offOriginRequestDiagnostics: [{method: "GET", path: "/must-be-blocked"}] }, line => lines.push(line));
  const { probe } = JSON.parse(lines[0]);
  assert.equal(probe.chromiumSandboxRequested, true);
  assert.equal(probe.chromiumSandbox, undefined);
  assert.deepEqual(probe.offOriginRequestDiagnostics, [{method: "GET", path: "/must-be-blocked"}]);
});
