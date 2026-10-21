import assert from "node:assert/strict";
import test from "node:test";
import { readAuthConfig } from "./auth-config";
import { requireAccessToken } from "./auth-token";

test("auth config fails closed for missing secret or invalid upstream", () => {
  const secret = "a".repeat(32);
  for (const env of [{}, { NEON_AUTH_BASE_URL: "https://example.neon.tech/auth" }, { NEON_AUTH_BASE_URL: "http://example.neon.tech/auth", NEON_AUTH_COOKIE_SECRET: secret }, { NEON_AUTH_BASE_URL: "https://user:pass@example.neon.tech/auth", NEON_AUTH_COOKIE_SECRET: secret }]) assert.equal(readAuthConfig(env), null);
  assert.deepEqual(readAuthConfig({ NEON_AUTH_BASE_URL: "https://example.neon.tech/auth", NEON_AUTH_COOKIE_SECRET: secret }), { baseUrl: "https://example.neon.tech/auth", secret });
});
test("token acquisition rejects missing tokens and propagates abort signal", async () => {
  const signal = new AbortController().signal;
  let received: AbortSignal | undefined;
  assert.equal(await requireAccessToken(async (options) => { received = options.fetchOptions.signal; return { data: { token: "signed-token" }, error: null }; }, signal), "signed-token");
  assert.equal(received, signal);
  await assert.rejects(requireAccessToken(async () => ({ data: null, error: null }), signal), { code: "UNAUTHORIZED" });
  await assert.rejects(requireAccessToken(async () => ({ data: { token: "" }, error: null }), signal), { code: "UNAUTHORIZED" });
  await assert.rejects(requireAccessToken(async () => ({ data: { token: "untrusted" }, error: {} }), signal), { code: "UNAUTHORIZED" });
});

test("an already aborted token request cannot authorize an API call", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(requireAccessToken(async () => ({ data: { token: "signed-token" }, error: null }), controller.signal), { name: "AbortError" });
});
