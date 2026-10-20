import { test } from "node:test";
import assert from "node:assert/strict";
import { createNeonRepository } from "../src/neon-repository.js";

test("SQL owner overrides stale serialized owner, including null", async () => {
  const repo = createNeonRepository({ query: async () => ({ rows: [{ data: { ownerId: "old" }, owner_id: null, created_at: "2026-01-01", expires_at: "2026-01-08" }] }) }, {} as never, "private");
  assert.equal((await repo.list())[0].ownerId, null);
});

test("expired lookup clamps batch and parameterizes timestamp", async () => {
  const repo = createNeonRepository({ query: async (sql, values) => {
    assert.match(sql, /expires_at <= \$1/);
    assert.deepEqual(values, ["2026-10-19T00:00:00Z", 25]);
    return { rows: [{ id: "expired" }] };
  } }, {} as never, "private");
  assert.deepEqual(await repo.listExpired("2026-10-19T00:00:00Z", 999), ["expired"]);
});

test("quota is one atomic conflict-conditional query and returns exhausted", async () => {
  const repo = createNeonRepository({ query: async (sql) => {
    assert.match(sql, /on conflict \(day\) do update/i);
    assert.match(sql, /attempts < 5/);
    assert.match(sql, /UTC/);
    return { rows: [] };
  } }, {} as never, "private");
  assert.equal(await repo.charge(), false);
});

test("object deletion failure or partial failure retains database metadata", async () => {
  let deleted = false;
  let failure: "throw" | "partial" | "none" = "throw";
  let calls = 0;
  const repo = createNeonRepository({ query: async () => { deleted = true; return { rows: [] }; } }, { send: async () => {
    if (failure === "throw") throw new Error("credentials must not escape");
    if (failure === "partial" && ++calls === 2) throw new Error("partial failure");
    return {};
  } }, "private");
  await assert.rejects(repo.remove("run"), /STORAGE_UNAVAILABLE/);
  assert.equal(deleted, false);
  failure = "partial";
  await assert.rejects(repo.remove("run"), /STORAGE_UNAVAILABLE/);
  assert.equal(deleted, false);
  failure = "none";
  await repo.remove("run");
  assert.equal(deleted, true);
});

test("upsert cannot resurrect deleted owner and does not serialize ownership", async () => {
  const repo = createNeonRepository({ query: async (sql, values) => {
    assert.doesNotMatch(sql.split(/do update/i)[1], /owner_id\s*=/);
    assert.equal(JSON.parse(values![4] as string).ownerId, undefined);
    return { rows: [] };
  } }, {} as never, "private");
  await repo.put({ id: "id", ownerId: "deleted", createdAt: "date", expiresAt: "date" } as never);
});

test("authoritative SQL expiry overrides serialized future expiry", async () => {
  const repo = createNeonRepository({ query: async () => ({ rows: [{ data: { expiresAt: "2099-01-01" }, owner_id: "owner", created_at: "2026-01-01", expires_at: "2026-01-08" }] }) }, {} as never, "private");
  assert.equal((await repo.list())[0].expiresAt, "2026-01-08T00:00:00.000Z");
});
