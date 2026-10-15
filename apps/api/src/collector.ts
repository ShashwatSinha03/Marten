import type { Exploration, NavigationDestination } from "../../../packages/contracts/src/index.js";
import { chromium, type Browser } from "playwright";
import { appendFile, mkdir, writeFile, rename } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { join } from "node:path";
import { startFixture } from "./fixture.js";
export interface ProbeEvent {
  sequence: number;
  at: string;
  type: string;
  pageId?: string;
  state?: string;
  url?: string;
}
export interface Options {
  brief?: string;
  onExploration?: (exploration: Exploration) => Promise<void>;
  directory?: string;
  maxPages?: number;
  durationMs?: number;
  navigationTimeoutMs?: number;
  signal?: AbortSignal;
  onEvent?: (event: ProbeEvent) => void | Promise<void>;
  onEvidence?: (evidence: Evidence, png: Buffer) => Promise<void>;
}
export interface Evidence {
  sourceEvidenceId?: string;
  navigationLabel?: string;
  id: string;
  url: string;
  status: number | null;
  capturedAt: string;
  text: string;
  links: string[];
  screenshot: string;
  screenshotSha256: string;
}
export async function runFixtureProbe(options: Options = {}) {
  for (const key of Object.keys(options))
    if (
      ![
        "brief",
        "onExploration",
        "directory",
        "maxPages",
        "durationMs",
        "navigationTimeoutMs",
        "signal",
        "onEvent",
        "onEvidence",
      ].includes(key)
    )
      throw new Error(`Unknown option: ${key}`);
  const {
    maxPages = 3,
    durationMs = 15000,
    navigationTimeoutMs = 1500,
  } = options;
  for (const [key, value, max] of [
    ["maxPages", maxPages, 3],
    ["durationMs", durationMs, 60000],
    ["navigationTimeoutMs", navigationTimeoutMs, 10000],
  ] as const)
    if (!Number.isInteger(value) || value < 1 || value > max)
      throw new Error(`Invalid ${key}`);
  if (options.brief !== undefined && (typeof options.brief !== "string" || options.brief.length > 1000)) throw new Error("Invalid brief");
  const exploration: Exploration = { destinations: [], attempted: 0, captured: 0, failed: 0, maxPages, candidateLimit: 100, stopReason: "exhausted" };
  const directory = join(
    options.directory ?? "output/playwright",
    randomUUID(),
  );
  await mkdir(directory, { recursive: true });
  const started = Date.now();
  const pages: Evidence[] = [];
  let state = "completed",
    error: string | undefined,
    browser: Browser | undefined;
  let fixture: Awaited<ReturnType<typeof startFixture>> | undefined;
  let collectionFailed = false;
  let blockedRequests = 0;
  let sequence = 0,
    peakNodeRssBytes = process.memoryUsage().rss,
    peakProcessTreeRssBytes: number | null = null;
  const sample = () => {
    peakNodeRssBytes = Math.max(peakNodeRssBytes, process.memoryUsage().rss);
    try {
      const rows = execFileSync("ps", ["-axo", "pid=,ppid=,rss="], {
        encoding: "utf8",
        timeout: 1000,
      })
        .trim()
        .split("\n")
        .map((line) => line.trim().split(/\s+/).map(Number));
      const ids = new Set([process.pid]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const [pid, ppid] of rows)
          if (ids.has(ppid) && !ids.has(pid)) {
            ids.add(pid);
            changed = true;
          }
      }
      const sum = rows
        .filter(([pid]) => ids.has(pid))
        .reduce((total, row) => total + row[2] * 1024, 0);
      peakProcessTreeRssBytes = Math.max(peakProcessTreeRssBytes ?? 0, sum);
    } catch {
      /* ps unavailable: measurement stays null, never substituted with Node RSS. */
    }
  };
  const event = async (data: Omit<ProbeEvent, "sequence" | "at">) => {
    const entry = {
      sequence: ++sequence,
      at: new Date().toISOString(),
      ...data,
    };
    await appendFile(
      join(directory, "events.jsonl"),
      JSON.stringify(entry) + "\n",
    );
    await options.onEvent?.(entry);
  };
  const stopped = () => {
    if (options.signal?.aborted) {
      state = "cancelled";
      return true;
    }
    if (Date.now() - started >= durationMs) {
      state = "timed_out";
      return true;
    }
    return false;
  };
  const interrupt = () => {
    void browser?.close().catch(() => {});
  };
  const timer = setTimeout(interrupt, durationMs);
  options.signal?.addEventListener("abort", interrupt, { once: true });
  const sampler = setInterval(sample, 200);
  try {
    await event({ type: "run_started" });
    if (!stopped()) {
      fixture = await startFixture();
      browser = await chromium.launch({
        headless: true,
        chromiumSandbox: true,
        timeout: Math.max(1, durationMs - (Date.now() - started)),
      });
      if (!stopped()) {
        const context = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          acceptDownloads: false,
          serviceWorkers: "block",
        });
        const origin = fixture.origin;
        await context.route("**/*", (route) => {
          if (
            new URL(route.request().url()).origin === origin &&
            route.request().method() === "GET"
          )
            return route.continue();
          blockedRequests++;
          return route.abort("blockedbyclient");
        });
        const page = await context.newPage();
        const queue: NavigationDestination[] = [];
        const seen = new Set<string>();
        const words = (options.brief ?? "").toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
        const priority = (entry: NavigationDestination) => words.filter(word => `${entry.url} ${entry.linkText ?? ""}`.toLowerCase().includes(word)).length;
        const discover = (raw: string, sourceEvidenceId?: string, linkText?: string) => {
          if (raw.length > 2048) { exploration.discoveryTruncated = true; return; }
          let target: URL;
          try { target = new URL(raw, origin); } catch { return; }
          target.hash = "";
          const url = target.href;
          if (seen.has(url)) return;
          if (exploration.destinations.length >= exploration.candidateLimit) { exploration.discoveryTruncated = true; return; }
          seen.add(url);
          const reason = !["http:", "https:"].includes(target.protocol) ? "unsupported_scheme"
            : target.username || target.password ? "credentials"
            : target.origin !== origin ? "off_origin"
            : /(?:logout|signout|delete|remove|purchase|checkout|submit|unsubscribe)/i.test(target.pathname + target.search) ? "action_policy" : undefined;
          const entry: NavigationDestination = { url, sourceEvidenceId, linkText, outcome: "skipped", reason: reason ?? "page_budget" };
          exploration.destinations.push(entry);
          if (!reason) queue.push(entry);
        };
        discover(origin + "/");
        while (queue.length && exploration.attempted < maxPages) {
          if (stopped()) break;
          queue.sort((a, b) => priority(b) - priority(a));
          const destination = queue.shift()!;
          const url = destination.url;
          exploration.attempted++;
          await event({ type: "page_started", url });
          let captured = false;
          try {
            const response = await page.goto(url, {
              waitUntil: "domcontentloaded",
              timeout: Math.min(
                navigationTimeoutMs,
                Math.max(1, durationMs - (Date.now() - started)),
              ),
            });
            const id = `page-${pages.length + 1}`;
            const screenshot = `${id}.png`;
            const text = (
              await page.locator("body").innerText({ timeout: 1000 })
            ).slice(0, 12000);
            if (await page.locator("a[href]").count() > 100) exploration.discoveryTruncated = true;
            const discovered = await page.locator("a[href]").evaluateAll(elements => elements.slice(0, 100).map(element => ({ url: (element as HTMLAnchorElement).href, text: (element.textContent ?? "").trim().slice(0, 160) })));
            if (discovered.some(link => link.url.length > 2048)) exploration.discoveryTruncated = true;
            const links = discovered.filter(link => link.url.length <= 2048).map(link => link.url);
            const png = await page.screenshot({
              path: join(directory, screenshot),
              timeout: 1500,
            });
            pages.push({
              id,
              ...(destination.sourceEvidenceId ? { sourceEvidenceId: destination.sourceEvidenceId } : {}),
              ...(destination.linkText ? { navigationLabel: destination.linkText } : {}),
              url: page.url(),
              status: response?.status() ?? null,
              capturedAt: new Date().toISOString(),
              text,
              links,
              screenshot,
              screenshotSha256: createHash("sha256").update(png).digest("hex"),
            });
            captured = true;
            await writeFile(
              join(directory, `${id}.json`),
              JSON.stringify(pages.at(-1), null, 2),
            );
            await options.onEvidence?.(pages.at(-1)!, png);
            destination.outcome = "captured";
            destination.evidenceId = id;
            delete destination.reason;
            exploration.captured++;
            for (const link of discovered) discover(link.url, id, link.text);
            sample();
            await event({ type: "page_captured", pageId: id, url });
          } catch (cause) {
            if (stopped()) {
              destination.outcome = "failed";
              destination.reason = state === "cancelled" ? "cancelled" : "deadline";
              exploration.failed++;
              break;
            }
            // Persistence failures must abort rather than masquerade as target failures.
            if (captured) { destination.reason = "persistence_failed"; throw cause; }
            destination.outcome = "failed";
            destination.reason = cause instanceof Error && cause.name === "TimeoutError" ? "navigation_timeout" : "navigation_failed";
            exploration.failed++;
            error = cause instanceof Error ? cause.message : String(cause);
            await event({ type: "page_failed", url, state: destination.reason });
          }
          await options.onExploration?.(exploration);
        }
      }
    }
  } catch (cause) {
    if (!stopped()) { collectionFailed = true; state = pages.length ? "partial" : "failed"; }
    error = cause instanceof Error ? cause.message : String(cause);
  } finally {
    clearTimeout(timer);
    clearInterval(sampler);
    options.signal?.removeEventListener("abort", interrupt);
    await browser?.close();
    await fixture?.close();
  }
  stopped();
  if (state === "completed" && exploration.failed) state = pages.length ? "partial" : "failed";
  exploration.stopReason = state === "cancelled" ? "cancelled" : state === "timed_out" ? "deadline" : (state === "failed" || collectionFailed) ? "failed" : exploration.attempted >= maxPages && exploration.destinations.some(d => d.reason === "page_budget") ? "page_budget" : "exhausted";
  for (const destination of exploration.destinations) if (destination.reason === "page_budget") destination.reason = exploration.stopReason;
  await options.onExploration?.(exploration);
  const result = {
    exploration,
    directory,
    state,
    blockedRequests,
    offOriginRequestsReceived: fixture?.offOriginRequestsReceived() ?? 0,
    pages,
    error,
    elapsedMs: Date.now() - started,
    browserClosed: !browser?.isConnected(),
    peakNodeRssBytes,
    peakProcessTreeRssBytes,
    memoryMeasurement:
      "Sampled ps RSS sum of Node and descendants; shared pages may be counted multiple times; not container peak memory.",
    scope: "controlled-fixture-only",
    chromiumSandbox: true,
  };
  await event({ type: "run_finished", state });
  await writeFile(
    join(directory, "manifest.tmp"),
    JSON.stringify(result, null, 2),
  );
  await rename(
    join(directory, "manifest.tmp"),
    join(directory, "manifest.json"),
  );
  return result;
}
