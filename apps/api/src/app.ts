import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  FIXTURE_URL,
  type Report,
  type Evidence,
} from "../../../packages/contracts/src/index.js";
import { runFixtureProbe, type Options } from "./collector.js";
import { analyzeEvidence, configuredModel } from "./gemini.js";
import {
  supabaseConfiguration,
  type Repository,
  type StoredRun,
} from "./repository.js";
interface Dependencies {
  repository: Repository;
  authenticate: (token: string) => Promise<string | null>;
  collect?: (options: Options) => Promise<{
    state: string;
    pages: unknown[];
  }>;
  analyze?: (
    evidence: Evidence[],
    brief: string,
    key: string,
    signal: AbortSignal,
  ) => Promise<Report>;
}
const activeStatuses = ["collecting", "analyzing"];
export function buildApp(
  deps: Dependencies | undefined = supabaseConfiguration(),
) {
  const app = Fastify({ logger: false, bodyLimit: 8192 });
  let active:
    | {
        id: string;
        controller: AbortController;
        task: Promise<void>;
      }
    | undefined;
  let admitting = false;
  const clean = (run: StoredRun) => {
    const { ownerId, events, ...publicRun } = run;
    return publicRun;
  };
  const fail = (code: string, status: number) =>
    Object.assign(new Error(code), { statusCode: status, code });
  app.setErrorHandler((error, _request, reply) => {
    const e = error as {
      statusCode?: number;
      code?: string;
    };
    const code =
      e.statusCode && e.statusCode < 500
        ? (e.code ?? "INVALID_REQUEST")
        : e.code === "NOT_CONFIGURED"
          ? "NOT_CONFIGURED"
          : "SERVICE_UNAVAILABLE";
    reply
      .code(e.statusCode ?? 503)
      .send({
        error: { code, message: code.replaceAll("_", " ").toLowerCase() },
      });
  });
  app.addHook("onRequest", async (request, reply) => {
    const origin = process.env.FRONTEND_ORIGIN;
    if (origin && request.headers.origin === origin) {
      reply
        .header("Access-Control-Allow-Origin", origin)
        .header("Vary", "Origin")
        .header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        .header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    }
    reply.header("Cache-Control", "no-store");
    if (request.method === "OPTIONS") return reply.code(204).send();
  });
  app.get("/health", async () => ({ status: "ok", mode: "fixture-only" }));
  app.addHook("onClose", async () => {
    active?.controller.abort();
    await active?.task;
  });
  app.register(
    async (api) => {
      api.addHook("preHandler", async (request) => {
        if (!deps) throw fail("NOT_CONFIGURED", 503);
        const header = request.headers.authorization;
        if (!header?.startsWith("Bearer ")) throw fail("UNAUTHORIZED", 401);
        const owner = await deps.authenticate(header.slice(7));
        if (!owner) throw fail("UNAUTHORIZED", 401);
        (
          request as typeof request & {
            owner: string;
          }
        ).owner = owner;
      });
      const owner = (request: unknown) =>
        (
          request as {
            owner: string;
          }
        ).owner;
      const owned = async (id: string, user: string) => {
        if (!/^[a-f0-9-]{36}$/.test(id)) throw fail("NOT_FOUND", 404);
        const run = (await deps!.repository.list()).find(
          (r) =>
            r.id === id &&
            r.ownerId === user &&
            Date.parse(r.expiresAt) > Date.now(),
        );
        if (!run) throw fail("NOT_FOUND", 404);
        if (activeStatuses.includes(run.status) && active?.id !== run.id) {
          run.status = run.evidence.length ? "partial" : "failed";
          run.errorCode = "RUN_INTERRUPTED";
          await deps!.repository.put(run);
        }
        return run;
      };
      api.get("/investigations", async (request) => {
        const runs = (await deps!.repository.list()).filter(
          (r) =>
            r.ownerId === owner(request) &&
            Date.parse(r.expiresAt) > Date.now(),
        );
        for (const run of runs) {
          if (activeStatuses.includes(run.status) && active?.id !== run.id) {
            run.status = run.evidence.length ? "partial" : "failed";
            run.errorCode = "RUN_INTERRUPTED";
            await deps!.repository.put(run);
          }
        }
        return { investigations: runs.map(clean) };
      });
      api.post("/investigations", async (request, reply) => {
        const body = request.body as Record<string, unknown> | null;
        if (
          !body ||
          body.mode !== "fixture" ||
          body.targetUrl !== FIXTURE_URL ||
          typeof body.apiKey !== "string" ||
          body.apiKey.length < 1 ||
          body.apiKey.length > 256 ||
          (body.brief !== undefined &&
            (typeof body.brief !== "string" || body.brief.length > 1000))
        )
          throw fail("INVALID_SCOPE_OR_INPUT", 400);
        if (active || admitting) throw fail("BUSY", 409);
        admitting = true;
        try {
          if (!(await deps!.repository.charge()))
            throw fail("DAILY_QUOTA", 429);
          const run: StoredRun = {
            id: randomUUID(),
            ownerId: owner(request),
            targetUrl: FIXTURE_URL,
            brief: (body.brief as string | undefined) ?? "",
            mode: "fixture",
            status: "collecting",
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
            evidence: [],
            events: [],
            report: null,
            errorCode: null,
            model: configuredModel(),
          };
          await deps!.repository.put(run);
          let key = body.apiKey;
          delete body.apiKey;
          const controller = new AbortController();
          const execute = async () => {
            let directory: string | undefined;
            try {
              directory = await mkdtemp(join(tmpdir(), "marten-"));
              const result = await (deps!.collect ?? runFixtureProbe)({
                directory,
                signal: controller.signal,
                onEvidence: async (page, png) => {
                  await deps!.repository.upload(run.id, page.id, png);
                  const { screenshot, ...evidence } = page;
                  run.evidence.push(evidence);
                  await deps!.repository.put(run);
                },
                onEvent: async (event) => {
                  run.events.push(event);
                  await deps!.repository.put(run);
                },
              });
              if (controller.signal.aborted || result.state === "cancelled") {
                run.status = "cancelled";
                return;
              }
              if (!run.evidence.length) {
                run.status = "failed";
                run.errorCode = "COLLECTION_FAILED";
                return;
              }
              run.status = "analyzing";
              await deps!.repository.put(run);
              run.report = await (deps!.analyze ?? analyzeEvidence)(
                run.evidence,
                run.brief,
                key,
                controller.signal,
              );
              run.report.limitations.push(
                "Analysis uses captured text, links and HTTP statuses; screenshots are provided for human inspection, not model visual analysis.",
                "Controlled fixture only; at most three pages inspected. No form submissions or authenticated flows tested.",
              );
              run.status = controller.signal.aborted
                ? "cancelled"
                : result.state === "completed"
                  ? "completed"
                  : "partial";
            } catch (error) {
              run.status = controller.signal.aborted
                ? "cancelled"
                : run.evidence.length
                  ? "partial"
                  : "failed";
              const code = error instanceof Error ? error.message : "";
              run.errorCode = [
                "PROVIDER_QUOTA",
                "PROVIDER_KEY",
                "INVALID_REPORT",
              ].includes(code)
                ? code
                : "INVESTIGATION_FAILED";
            } finally {
              key = "";
              try {
                await deps!.repository.put(run);
              } finally {
                if (directory)
                  await rm(directory, { recursive: true, force: true });
                active = undefined;
              }
            }
          };
          active = { id: run.id, controller, task: Promise.resolve() };
          active.task = execute().catch(() => {
            active = undefined;
          });
          return reply.code(202).send({ investigation: clean(run) });
        } finally {
          admitting = false;
        }
      });
      api.get<{
        Params: {
          id: string;
        };
      }>("/investigations/:id", async (request) => ({
        investigation: clean(await owned(request.params.id, owner(request))),
      }));
      api.get<{
        Params: {
          id: string;
        };
        Querystring: {
          after?: string;
        };
      }>("/investigations/:id/events", async (request) => {
        const run = await owned(request.params.id, owner(request));
        const after = Number(request.query.after ?? 0);
        if (!Number.isSafeInteger(after) || after < 0)
          throw fail("INVALID_CURSOR", 400);
        return { events: run.events.filter((e) => e.sequence > after) };
      });
      api.get<{
        Params: {
          id: string;
          evidenceId: string;
        };
      }>("/investigations/:id/evidence/:evidenceId", async (request, reply) => {
        const run = await owned(request.params.id, owner(request));
        if (!run.evidence.some((e) => e.id === request.params.evidenceId))
          throw fail("NOT_FOUND", 404);
        return reply
          .type("image/png")
          .send(
            await deps!.repository.download(run.id, request.params.evidenceId),
          );
      });
      api.post<{
        Params: {
          id: string;
        };
      }>("/investigations/:id/cancel", async (request) => {
        const run = await owned(request.params.id, owner(request));
        if (active?.id === run.id) active.controller.abort();
        return { investigation: clean(run) };
      });
      api.delete<{
        Params: {
          id: string;
        };
      }>("/investigations/:id", async (request, reply) => {
        const run = await owned(request.params.id, owner(request));
        if (active?.id === run.id) throw fail("BUSY", 409);
        await deps!.repository.remove(run.id);
        return reply.code(204).send();
      });
    },
    { prefix: "/v1" },
  );
  return app;
}
