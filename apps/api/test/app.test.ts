import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";
test("health is available without exposing investigation triggers", async () => {
  const app = buildApp();
  try {
    assert.equal((await app.inject("/health")).statusCode, 200);
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/investigations",
          payload: { url: "http://localhost" },
        })
      ).statusCode,
      404,
    );
  } finally {
    await app.close();
  }
});
