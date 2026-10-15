import { test } from "node:test";
import assert from "node:assert/strict";
import { supabaseConfiguration } from "../src/repository.js";

for (const key of ["sb_secret_test", "eyJtest.payload.signature"]) {
  test(`Supabase transport uses the correct authorization for ${key.startsWith("sb_") ? "modern" : "legacy"} keys`, async (context) => {
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SECRET_KEY;
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SECRET_KEY = key;
    context.after(() => {
      if (originalUrl === undefined) delete process.env.SUPABASE_URL;
      else process.env.SUPABASE_URL = originalUrl;
      if (originalKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
      else process.env.SUPABASE_SECRET_KEY = originalKey;
    });
    const paths: string[] = [];
    context.mock.method(
      globalThis,
      "fetch",
      async (url: string, init: RequestInit) => {
        const headers = new Headers(init.headers);
        const path = new URL(url).pathname;
        paths.push(path);
        assert.equal(headers.get("apikey"), key);
        assert.equal(
          headers.get("Authorization"),
          path === "/auth/v1/user"
            ? "Bearer user-token"
            : key.startsWith("sb_secret_")
              ? null
              : `Bearer ${key}`,
        );
        return new Response(
          JSON.stringify(
            path === "/auth/v1/user"
              ? { id: "alice" }
              : path.startsWith("/rest/")
                ? []
                : {},
          ),
        );
      },
    );
    const config = supabaseConfiguration()!;
    await config.repository.list();
    await config.repository.upload("run", "page-1", Buffer.from("png"));
    assert.equal(await config.authenticate("user-token"), "alice");
    assert.equal(paths.length, 3);
  });
}

test("expired query is independent of history cap and deletion keeps metadata until storage succeeds", async (context) => {
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
  context.after(() => {
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = originalKey;
  });
  let storageFails = true;
  let databaseFails = true;
  const deletions: string[] = [];
  context.mock.method(globalThis, "fetch", async (input: string, init: RequestInit) => {
    const url = new URL(input);
    if (init.method !== "DELETE") {
      assert.equal(url.searchParams.get("select"), "id");
      assert.equal(url.searchParams.get("expires_at"), "lte.2026-10-11T00:00:00.000Z");
      assert.equal(url.searchParams.get("order"), "expires_at.asc,id.asc");
      assert.equal(url.searchParams.get("limit"), "25");
      return new Response(JSON.stringify([{ id: "old-expired" }]));
    }
    if (url.pathname.startsWith("/storage/")) {
      deletions.push("storage");
      assert.deepEqual(JSON.parse(init.body as string).prefixes, ["old-expired/page-1.png", "old-expired/page-2.png", "old-expired/page-3.png"]);
      return new Response("{}", { status: storageFails ? 503 : 200 });
    }
    deletions.push("database");
    return new Response("{}", { status: databaseFails ? 503 : 200 });
  });
  const repo = supabaseConfiguration()!.repository;
  assert.deepEqual(await repo.listExpired("2026-10-11T00:00:00.000Z", 1000), ["old-expired"]);
  await assert.rejects(repo.remove("old-expired"));
  assert.deepEqual(deletions, ["storage"]);
  storageFails = false;
  await assert.rejects(repo.remove("old-expired"));
  databaseFails = false;
  await repo.remove("old-expired");
  assert.deepEqual(deletions, ["storage", "storage", "database", "storage", "database"]);
});
