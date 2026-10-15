import { test } from "node:test";
import assert from "node:assert/strict";
import { createRetentionWorker } from "../src/retention.js";

test("retention bounds expired queries, skips active runs, and retries failed deletion", async () => {
  const removed: string[] = [];
  let fail = true;
  const worker = createRetentionWorker({
    async listExpired(before, limit) {
      assert.equal(before, "2026-10-11T00:00:00.000Z");
      assert.equal(limit, 25);
      return ["failed", "active", "expired"];
    },
    async remove(id) {
      if (id === "failed" && fail) throw new Error("private storage detail");
      removed.push(id);
    },
  }, { now: () => Date.parse("2026-10-11T00:00:00Z"), activeId: () => "active" });
  assert.deepEqual(await worker.run(), { removed: 1, failed: 1 });
  assert.deepEqual(removed, ["expired"]);
  fail = false;
  assert.deepEqual(await worker.run(), { removed: 2, failed: 0 });
  await worker.stop();
});

test("retention starts immediately, stays single-flight, and shutdown drains work", async () => {
  let calls = 0;
  let tick: (() => void) | undefined;
  let cleared = false;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const worker = createRetentionWorker({
    async listExpired() { calls++; await gate; return []; },
    async remove() {},
  }, {
    schedule(callback, delay) { assert.equal(delay, 15 * 60_000); tick = callback; return () => { cleared = true; }; },
  });
  worker.start();
  tick!();
  const first = worker.run();
  assert.equal(worker.run(), first);
  assert.equal(calls, 1);
  let stopped = false;
  const stopping = worker.stop().then(() => { stopped = true; });
  await Promise.resolve();
  assert.equal(cleared, true);
  assert.equal(stopped, false);
  release();
  await stopping;
  tick!();
  await worker.run();
  assert.equal(calls, 1);
});

test("query failure is bounded and next pass retries", async () => {
  let calls = 0;
  const worker = createRetentionWorker({
    async listExpired() { if (++calls === 1) throw new Error("secret"); return []; },
    async remove() {},
  });
  assert.deepEqual(await worker.run(), { removed: 0, failed: 1 });
  assert.deepEqual(await worker.run(), { removed: 0, failed: 0 });
  await worker.stop();
});

test("shutdown finishes the current deletion but starts no subsequent deletion", async () => {
  const removed: string[] = [];
  let release!: () => void;
  let began!: () => void;
  const started = new Promise<void>(resolve => { began = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const worker = createRetentionWorker({
    async listExpired() { return ["first", "second"]; },
    async remove(id) { removed.push(id); began(); await gate; },
  });
  const running = worker.run();
  await started;
  const stopping = worker.stop();
  release();
  await stopping;
  assert.deepEqual(await running, { removed: 1, failed: 0 });
  assert.deepEqual(removed, ["first"]);
});
