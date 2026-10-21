import assert from "node:assert/strict";
import test from "node:test";
import { readAuthConfig } from "./auth-config";
import { requireAccessToken } from "./auth-token";

test("auth config fails closed for missing secret or invalid upstream", () => {
  const secret = "a".repeat(32);
  for (const env of [{}, { NEON_AUTH_BASE_URL: "https://example.neon.tech/auth" }, { NEON_AUTH_BASE_URL: "http://example.neon.tech/auth", NEON_AUTH_COOKIE_SECRET: secret }, { NEON_AUTH_BASE_URL: "https://user:pass@example.neon.tech/auth", NEON_AUTH_COOKIE_SECRET: secret }]) assert.equal(readAuthConfig(env), null);
  assert.deepEqual(readAuthConfig({ NEON_AUTH_BASE_URL: "https://example.neon.tech/auth", NEON_AUTH_COOKIE_SECRET: secret }), { baseUrl: "https://example.neon.tech/auth", secret });
});
test("token endpoint bypasses session cache and sends bounded same-origin GET", async () => {
  const signal = new AbortController().signal;
  let received: RequestInit | undefined;
  let endpoint: unknown;
  const token = await requireAccessToken(async (url, options) => {
    endpoint = url;
    received = options;
    return Response.json({ token: "signed-token" });
  }, signal);
  assert.equal(token, "signed-token");
  assert.equal(endpoint, "/api/auth/token");
  assert.equal(received?.method, "GET");
  assert.equal(received?.signal, signal);
  assert.equal(received?.cache, "no-store");
  assert.equal(received?.credentials, "same-origin");
});

test("session-shaped, missing, and non-string token responses fail closed", async () => {
  const signal = new AbortController().signal;
  for (const body of [{ session: { token: "session-token" }, user: { id: "u" } }, {}, { token: "" }, { token: 42 }, null]) {
    await assert.rejects(requireAccessToken(async () => Response.json(body), signal), { code: "UNAUTHORIZED" });
  }
});

test("failed token endpoint never trusts token-shaped response body", async () => {
  const signal = new AbortController().signal;
  for (const status of [401, 403, 500]) {
    await assert.rejects(requireAccessToken(async () => Response.json({ token: "untrusted" }, { status }), signal), { code: "UNAUTHORIZED" });
  }
  await assert.rejects(requireAccessToken(async () => new Response("not-json"), signal), { code: "UNAUTHORIZED" });
  await assert.rejects(requireAccessToken(async () => { throw new TypeError("network"); }, signal), { name: "TypeError" });
});

test("an already aborted token request cannot authorize an API call", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(requireAccessToken(async () => Response.json({ token: "signed-token" }), controller.signal), { name: "AbortError" });
});
