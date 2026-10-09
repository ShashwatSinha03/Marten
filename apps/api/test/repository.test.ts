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
