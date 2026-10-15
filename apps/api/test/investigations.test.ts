import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";
import { validateReport } from "../src/gemini.js";
import type { StoredRun, Repository } from "../src/repository.js";
class Memory implements Repository {
  async listExpired(before: string, limit: number) {
    return (await this.list()).filter(run => Date.parse(run.expiresAt) <= Date.parse(before)).slice(0, limit).map(run => run.id);
  }
  charges = 0;
  async charge() {
    return ++this.charges <= 5;
  }
  runs = new Map<string, StoredRun>();
  shots = new Map<string, Buffer>();
  async list() {
    return [...this.runs.values()].map((x) => structuredClone(x));
  }
  async put(run: StoredRun) {
    this.runs.set(run.id, structuredClone(run));
  }
  async remove(id: string) {
    this.runs.delete(id);
  }
  async upload(id: string, page: string, bytes: Buffer) {
    this.shots.set(id + "/" + page, bytes);
  }
  async download(id: string, page: string) {
    return this.shots.get(id + "/" + page)!;
  }
}
const payload = {
  targetUrl: "https://fixture.marten.test",
  mode: "fixture",
  apiKey: "secret-key",
};
const headers = { authorization: "Bearer alice" };
test("unconfigured API fails closed", async () => {
  const app = buildApp();
  assert.equal((await app.inject("/v1/investigations")).statusCode, 503);
  await app.close();
});
test("identity, scope, global busy, ownership and cancellation", async () => {
  const repo = new Memory();
  const app = buildApp({
    repository: repo,
    authenticate: async (token) => token,
    collect: async (options) => {
      await new Promise<void>((resolve) =>
        options.signal!.addEventListener("abort", () => resolve(), {
          once: true,
        }),
      );
      return { state: "cancelled", pages: [] };
    },
    analyze: async () => ({ summary: "ok", findings: [], limitations: [] }),
  });
  assert.equal((await app.inject("/v1/investigations")).statusCode, 401);
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/v1/investigations",
        headers,
        payload: { ...payload, targetUrl: "https://example.com" },
      })
    ).statusCode,
    400,
  );
  const result = await app.inject({
    method: "POST",
    url: "/v1/investigations",
    headers,
    payload,
  });
  assert.equal(result.statusCode, 202);
  const id = result.json().investigation.id;
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/v1/investigations",
        headers,
        payload,
      })
    ).statusCode,
    409,
  );
  for (const path of ["", "/events", "/evidence/page-1"])
    assert.equal(
      (
        await app.inject({
          url: "/v1/investigations/" + id + path,
          headers: { authorization: "Bearer bob" },
        })
      ).statusCode,
      404,
    );
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/v1/investigations/" + id + "/cancel",
        headers,
      })
    ).statusCode,
    200,
  );
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(repo.runs.get(id)?.status, "cancelled");
  assert.ok(!JSON.stringify([...repo.runs.values()]).includes("secret-key"));
  const run = repo.runs.get(id)!;
  run.expiresAt = "2000-01-01T00:00:00Z";
  await repo.put(run);
  assert.equal(
    (await app.inject({ url: "/v1/investigations/" + id, headers })).statusCode,
    404,
  );
  await app.close();
});
test("reports reject invented citations", () => {
  assert.throws(() =>
    validateReport(
      {
        summary: "x",
        limitations: [],
        findings: [
          {
            id: "f",
            title: "x",
            observation: "x",
            impact: "x",
            recommendation: "x",
            kind: "observed",
            severity: "high",
            evidenceIds: ["forged"],
          },
        ],
      },
      [],
    ),
  );
});
test("durable evidence survives provider quota errors without leaking provider secrets", async () => {
  const repo = new Memory();
  const app = buildApp({
    repository: repo,
    authenticate: async (token) => token,
    collect: async (options) => {
      await options.onEvidence!(
        {
          id: "page-1",
          url: payload.targetUrl,
          status: 200,
          capturedAt: new Date().toISOString(),
          text: "Fixture",
          links: [],
          screenshot: "page-1.png",
          screenshotSha256: "abc",
        },
        Buffer.from("png"),
      );
      await options.onEvent!({
        sequence: 1,
        at: new Date().toISOString(),
        type: "page_captured",
        pageId: "page-1",
      });
      return { state: "completed", pages: [] };
    },
    analyze: async () => {
      throw new Error("PROVIDER_QUOTA");
    },
  });
  const response = await app.inject({
    method: "POST",
    url: "/v1/investigations",
    headers,
    payload,
  });
  const id = response.json().investigation.id;
  for (let i = 0; i < 100 && repo.runs.get(id)?.status !== "partial"; i++)
    await new Promise((r) => setTimeout(r, 10));
  const run = repo.runs.get(id)!;
  assert.equal(run.status, "partial");
  assert.equal(run.errorCode, "PROVIDER_QUOTA");
  assert.equal(run.evidence.length, 1);
  assert.equal(run.events.length, 1);
  assert.ok(!JSON.stringify(run).includes(payload.apiKey));
  assert.equal(
    (
      await app.inject({
        url: `/v1/investigations/${id}/evidence/page-1`,
        headers,
      })
    ).body,
    "png",
  );
  await app.close();
});
test("cancel during analysis preserves evidence and returns cancelled", async () => {
  const repo = new Memory();
  const app = buildApp({
    repository: repo,
    authenticate: async (token) => token,
    collect: async (options) => {
      await options.onEvidence!(
        {
          id: "page-1",
          url: payload.targetUrl,
          status: 200,
          capturedAt: new Date().toISOString(),
          text: "Fixture",
          links: [],
          screenshot: "page-1.png",
          screenshotSha256: "abc",
        },
        Buffer.from("png"),
      );
      return { state: "completed", pages: [] };
    },
    analyze: async (_e, _b, _k, signal) => {
      await new Promise<void>((resolve) =>
        signal.addEventListener("abort", () => resolve(), { once: true }),
      );
      throw new Error("secret-key");
    },
  });
  const response = await app.inject({
    method: "POST",
    url: "/v1/investigations",
    headers,
    payload,
  });
  const id = response.json().investigation.id;
  for (let i = 0; i < 100 && repo.runs.get(id)?.status !== "analyzing"; i++)
    await new Promise((r) => setTimeout(r, 10));
  await app.inject({
    method: "POST",
    url: `/v1/investigations/${id}/cancel`,
    headers,
  });
  await app.close();
  const run = repo.runs.get(id)!;
  assert.equal(run.status, "cancelled");
  assert.equal(run.evidence.length, 1);
  assert.ok(!JSON.stringify(run).includes("secret-key"));
});
test("real collector saves evidence and events before report generation", async () => {
  const repo = new Memory();
  const app = buildApp({
    repository: repo,
    authenticate: async (token) => token,
    analyze: async (evidence) => {
      assert.equal(evidence.length, 2);
      assert.equal(repo.shots.size, 2);
      assert.equal([...repo.runs.values()][0].exploration?.attempted, 3);
      assert.equal([...repo.runs.values()][0].exploration?.failed, 1);
      assert.equal(
        [...repo.runs.values()][0].events.filter(
          (e) => e.type === "page_captured",
        ).length,
        2,
      );
      return {
        summary: "Fixture inspection complete.",
        findings: [],
        limitations: [],
      };
    },
  });
  const response = await app.inject({
    method: "POST",
    url: "/v1/investigations",
    headers,
    payload,
  });
  const id = response.json().investigation.id;
  for (let i = 0; i < 300 && !repo.runs.get(id)?.report; i++)
    await new Promise((r) => setTimeout(r, 50));
  const run = repo.runs.get(id)!;
  assert.equal(run.status, "partial");
  assert.ok(run.report);
  assert.equal(run.evidence.length, 2);
  assert.equal(run.exploration?.captured, 2);
  assert.equal(run.report?.findings[0]?.kind, "observed");
  await app.close();
});
test("daily budget exhaustion rejects work before collector starts", async () => {
  const repo = new Memory();
  repo.charges = 5;
  const app = buildApp({
    repository: repo,
    authenticate: async (token) => token,
  });
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/v1/investigations",
        headers,
        payload,
      })
    ).statusCode,
    429,
  );
  assert.equal(repo.runs.size, 0);
  await app.close();
});
test("history reconciles runs interrupted by a restart", async () => {
  const repo = new Memory();
  const id = "11111111-1111-1111-1111-111111111111";
  await repo.put({
    id,
    ownerId: "alice",
    targetUrl: payload.targetUrl,
    brief: "",
    mode: "fixture",
    status: "collecting",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    evidence: [],
    events: [],
    report: null,
    errorCode: null,
  });
  const app = buildApp({
    repository: repo,
    authenticate: async (token) => token,
  });
  const response = await app.inject({ url: "/v1/investigations", headers });
  assert.equal(response.json().investigations[0].status, "failed");
  assert.equal(repo.runs.get(id)?.errorCode, "RUN_INTERRUPTED");
  await app.close();
});
test("report validation rejects duplicate finding IDs", () => {
  const evidence = {
    id: "page-1",
    url: payload.targetUrl,
    status: 200,
    capturedAt: "now",
    text: "x",
    links: [],
    screenshotSha256: "abc",
  };
  const finding = {
    id: "f",
    title: "x",
    observation: "x",
    impact: "x",
    recommendation: "x",
    kind: "observed",
    severity: "high",
    evidenceIds: ["page-1"],
  };
  assert.throws(
    () =>
      validateReport(
        { summary: "x", limitations: [], findings: [finding, finding] },
        [evidence],
      ),
    /INVALID_REPORT/,
  );
});
test("ownership and expiry guard every resource mutation and read", async () => {
  const repo = new Memory();
  const id = "11111111-1111-1111-1111-111111111111";
  const run: StoredRun = {
    id,
    ownerId: "alice",
    targetUrl: payload.targetUrl,
    brief: "",
    mode: "fixture",
    status: "completed",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    evidence: [],
    events: [],
    report: null,
    errorCode: null,
  };
  await repo.put(run);
  const app = buildApp({
    repository: repo,
    authenticate: async (token) => token,
  });
  const routes = [
    { method: "GET" as const, path: "" },
    { method: "GET" as const, path: "/events" },
    { method: "GET" as const, path: "/evidence/page-1" },
    { method: "POST" as const, path: "/cancel" },
    { method: "DELETE" as const, path: "" },
  ];
  for (const route of routes)
    assert.equal(
      (
        await app.inject({
          method: route.method,
          url: `/v1/investigations/${id}${route.path}`,
          headers: { authorization: "Bearer bob" },
        })
      ).statusCode,
      404,
    );
  run.expiresAt = "2000-01-01T00:00:00Z";
  await repo.put(run);
  for (const route of routes)
    assert.equal(
      (
        await app.inject({
          method: route.method,
          url: `/v1/investigations/${id}${route.path}`,
          headers,
        })
      ).statusCode,
      404,
    );
  assert.deepEqual(
    (await app.inject({ url: "/v1/investigations", headers })).json()
      .investigations,
    [],
  );
  await app.close();
});

test("startup cleanup runs without blocking health and close drains its current deletion", async () => {
  const repo = new Memory();
  let release!: () => void;
  let deleting!: () => void;
  const started = new Promise<void>(resolve => { deleting = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  repo.listExpired = async () => ["expired"];
  repo.remove = async () => { deleting(); await gate; };
  const app = buildApp({ repository: repo, authenticate: async () => "alice" });
  assert.equal((await app.inject("/health")).statusCode, 200);
  await started;
  let closed = false;
  const closing = app.close().then(() => { closed = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(closed, false);
  release();
  await closing;
  assert.equal(closed, true);
});
