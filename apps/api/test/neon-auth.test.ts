import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import { createAuthenticator } from "../src/neon-auth.js";

test("JWT verification requires correct signature, issuer, audience, expiry and subject", async () => {
  const { privateKey, publicKey } = await generateKeyPair("EdDSA");
  const key = await exportJWK(publicKey);
  const authenticate = createAuthenticator(createLocalJWKSet({ keys: [key] }), "https://auth.example/auth", "https://auth.example/auth");
  const sign = (claims: Record<string, unknown> = {}) => new SignJWT({ sub: "alice", iss: "https://auth.example/auth", aud: "https://auth.example/auth", exp: Math.floor(Date.now()/1000)+60, ...claims }).setProtectedHeader({ alg: "EdDSA" }).sign(privateKey);
  assert.equal(await authenticate(await sign()), "alice");
  for (const claims of [{ iss: "wrong" }, { aud: "wrong" }, { exp: 1 }, { exp: undefined }, { sub: "" }]) assert.equal(await authenticate(await sign(claims)), null);
  assert.equal(await authenticate("forged.payload.signature"), null);
  const attacker = await generateKeyPair("EdDSA");
  assert.equal(await authenticate(await new SignJWT({ sub: "alice", iss: "https://auth.example/auth", aud: "https://auth.example/auth" }).setProtectedHeader({ alg: "EdDSA" }).setExpirationTime("1m").sign(attacker.privateKey)), null);
});
