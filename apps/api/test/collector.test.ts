import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFixtureProbe } from "../src/collector.js";
const output = () => mkdtemp(join(tmpdir(), "marten-test-"));
test("captures real healthy and 404 evidence, enforces page cap, and persists linked events", async () => {
  const directory = await output();
  const result = await runFixtureProbe({ directory, maxPages: 2, navigationTimeoutMs: 5000 });
  assert.equal(result.state, "completed");
  assert.deepEqual(
    result.pages.map((p: any) => p.status),
    [200, 404],
  );
  assert.match(result.pages[0].text, /Marten fixture/);
  const png = await readFile(
    join(result.directory, result.pages[0].screenshot),
  );
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.deepEqual(
    JSON.parse(await readFile(join(result.directory, "page-1.json"), "utf8")),
    result.pages[0],
  );
  const events = (
    await readFile(join(result.directory, "events.jsonl"), "utf8")
  )
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(events.filter((e: any) => e.type === "page_captured").length, 2);
  assert.equal(events.at(-1).state, result.state);
  assert.deepEqual(
    JSON.parse(await readFile(join(result.directory, "manifest.json"), "utf8"))
      .pages,
    result.pages,
  );
});
test("hanging page times out and preserves earlier evidence", async () => {
  const result = await runFixtureProbe({
    directory: await output(),
    maxPages: 3,
    navigationTimeoutMs: 500,
  });
  assert.equal(result.state, "partial");
  assert.equal(result.pages.length, 2);
  assert.match(result.error ?? "", /Timeout/);
});
test("cancellation preserves evidence and closes the browser", async () => {
  const controller = new AbortController();
  const result = await runFixtureProbe({
    directory: await output(),
    signal: controller.signal,
    onEvent: (e: any) => {
      if (e.type === "page_captured") controller.abort();
    },
  });
  assert.equal(result.state, "cancelled");
  assert.equal(result.pages.length, 1);
  assert.equal(result.browserClosed, true);
});
test("deadline bounds run and pre-cancellation launches no browser", async () => {
  const result = await runFixtureProbe({
    directory: await output(),
    durationMs: 1,
  });
  assert.equal(result.state, "timed_out");
  const cancelled = await runFixtureProbe({
    directory: await output(),
    signal: AbortSignal.abort(),
  });
  assert.equal(cancelled.state, "cancelled");
  assert.equal(cancelled.pages.length, 0);
});
test("rejects arbitrary destinations and invalid budgets", async () => {
  await assert.rejects(
    runFixtureProbe({ targetUrl: "https://example.com" } as any),
    /Unknown option/,
  );
  await assert.rejects(runFixtureProbe({ maxPages: 4 }), /maxPages/);
});

test("deadline interrupts an active hanging navigation and retains completed pages", async () => {
  let reachedHang = false;
  const result = await runFixtureProbe({
    directory: await output(),
    durationMs: 6000,
    navigationTimeoutMs: 10000,
    onEvent: (event) => {
      if (event.url?.endsWith("/hang")) reachedHang = true;
    },
  });
  assert.equal(reachedHang, true);
  assert.equal(result.state, "timed_out");
  assert.equal(result.exploration.destinations.find(d => d.url.endsWith("/hang"))?.reason, "deadline");
  assert.equal(result.exploration.failed, 1);
  assert.equal(result.pages.length, 2);
  assert.equal(result.browserClosed, true);
  assert.ok(result.elapsedMs < 8500);
});

test("blocks a real off-origin fixture subrequest before it reaches the second server", async () => {
  const result = await runFixtureProbe({
    directory: await output(),
    maxPages: 1,
  });
  assert.ok(result.blockedRequests >= 1);
  assert.equal(result.offOriginRequestsReceived, 0);
});

test("discovers canonical links and records unvisited and policy-rejected destinations", async () => {
  const result = await runFixtureProbe({ directory: await output(), maxPages: 2, navigationTimeoutMs: 5000 });
  const map = result.exploration;
  assert.equal(map.attempted, 2);
  assert.equal(map.stopReason, "page_budget");
  assert.equal(map.destinations.filter(d => new URL(d.url).pathname === "/missing").length, 1);
  assert.ok(map.destinations.some(d => d.reason === "action_policy"));
  assert.ok(map.destinations.some(d => d.reason === "off_origin"));
  assert.equal(result.pages[1].sourceEvidenceId, "page-1");
});

test("brief prioritizes discovered healthy destination without changing policy", async () => {
  const result = await runFixtureProbe({ directory: await output(), maxPages: 2, brief: "healthy guide logout external" });
  assert.equal(new URL(result.pages[1].url).pathname, "/guide");
  assert.deepEqual(result.pages.map(p => p.status), [200, 200]);
  assert.equal(result.offOriginRequestsReceived, 0);
});

test("failed navigation consumes budget and collection continues", async () => {
  const result = await runFixtureProbe({ directory: await output(), brief: "hanging destination", navigationTimeoutMs: 1000 });
  assert.equal(result.exploration.attempted, 3);
  assert.equal(result.exploration.failed, 1);
  assert.equal(result.pages.length, 2);
  assert.equal(result.pages[1].status, 404);
  assert.equal(result.state, "partial");
});


test("persistence failure aborts collection and is not a navigation failure", async () => {
  const result = await runFixtureProbe({ directory: await output(), onEvidence: async () => { throw new Error("storage failed"); } });
  assert.equal(result.exploration.attempted, 1);
  assert.equal(result.exploration.failed, 0);
  assert.equal(result.exploration.stopReason, "failed");
  assert.match(result.error ?? "", /storage failed/);
});
