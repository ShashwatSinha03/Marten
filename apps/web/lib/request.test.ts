import assert from "node:assert/strict";
import { test } from "node:test";
import { boundedRequest, RequestError } from "./request";

test("slow operation times out and aborts its network signal", async () => {
  let signal: AbortSignal | undefined;
  await assert.rejects(
    boundedRequest((value) => {
      signal = value;
      return new Promise(() => {});
    }, 10),
    (error: unknown) => error instanceof RequestError && error.code === "TIMEOUT",
  );
  assert.equal(signal?.aborted, true);
});

test("response body stalls are bounded after headers arrive", async () => {
  const response = new Response(new ReadableStream({ start() {} }));
  await assert.rejects(
    boundedRequest(async () => response.json(), 10),
    (error: unknown) => error instanceof RequestError && error.code === "TIMEOUT",
  );
});

test("network errors become actionable messages without leaking original details", async () => {
  await assert.rejects(
    boundedRequest(async () => { throw new TypeError("sensitive internal detail"); }),
    (error: unknown) => error instanceof RequestError && error.code === "NETWORK_ERROR" && !error.message.includes("sensitive"),
  );
});

test("API errors keep their recovery message and successful calls return normally", async () => {
  const expected = new RequestError("UNAUTHORIZED", "Sign in again.");
  await assert.rejects(boundedRequest(async () => { throw expected; }), (error: unknown) => error === expected);
  assert.equal(await boundedRequest(async () => "loaded"), "loaded");
});
