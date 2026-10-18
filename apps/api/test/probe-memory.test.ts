import { test } from "node:test";
import assert from "node:assert/strict";
import { readProbeMemory } from "../src/probe-memory.js";

test("cgroup memory diagnostics expose only validated counters and identify lifetime peak", async () => {
  const stats = await readProbeMemory(async path => path.endsWith("memory.current") ? "123\n" : path.endsWith("memory.peak") ? "456\n" : "max\n");
  assert.equal(stats.currentBytes, 123);
  assert.equal(stats.peakBytes, 456);
  assert.equal(stats.limitBytes, null);
  assert.equal(stats.limit, "unlimited");
  assert.match(stats.measurement, /lifetime/);
});
test("missing or malformed cgroup files are unavailable, never raw diagnostics", async () => {
  const stats = await readProbeMemory(async path => { if (path.endsWith("memory.peak")) throw new Error("private"); return "private"; });
  assert.equal(stats.currentBytes, null);
  assert.equal(stats.peakBytes, null);
  assert.equal(stats.limitBytes, null);
  assert.equal(stats.limit, "unavailable");
  assert.ok(!JSON.stringify(stats).includes("private"));
});
