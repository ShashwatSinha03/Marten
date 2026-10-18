import { test } from "node:test";
import assert from "node:assert/strict";
import { startFixture } from "../src/fixture.js";

test("off-origin diagnostics classify controlled paths and bound untrusted data", async () => {
  const fixture = await startFixture();
  try {
    const html = await (await fetch(fixture.origin)).text();
    const origin = /src="(http:\/\/127\.0\.0\.1:\d+)\/must-be-blocked"/.exec(html)![1];
    await fetch(`${origin}/must-be-blocked?secret=private`);
    await fetch(`${origin}/private-token`, { method: "POST", headers: { Authorization: "private" } });
    for (let i = 0; i < 12; i++) await fetch(`${origin}/health`);
    const diagnostics = fixture.offOriginRequestDiagnostics();
    assert.equal(fixture.offOriginRequestsReceived(), 14);
    assert.equal(diagnostics.length, 10);
    assert.deepEqual(diagnostics[0], { method: "GET", path: "/must-be-blocked" });
    assert.deepEqual(diagnostics[1], { method: "POST", path: "other" });
    assert.ok(!JSON.stringify(diagnostics).includes("private"));
  } finally { await fixture.close(); }
});
