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
interface Options {
  directory?: string;
  maxPages?: number;
  durationMs?: number;
  navigationTimeoutMs?: number;
  signal?: AbortSignal;
  onEvent?: (event: ProbeEvent) => void;
}
interface Evidence {
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
        "directory",
        "maxPages",
        "durationMs",
        "navigationTimeoutMs",
        "signal",
        "onEvent",
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
    options.onEvent?.(entry);
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
        for (const path of ["/", "/missing", "/hang"].slice(0, maxPages)) {
          if (stopped()) break;
          const url = origin + path;
          await event({ type: "page_started", url });
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
          const links = await page
            .locator("a[href]")
            .evaluateAll((elements) =>
              elements
                .slice(0, 100)
                .map((element) => (element as HTMLAnchorElement).href),
            );
          const png = await page.screenshot({
            path: join(directory, screenshot),
            timeout: 1500,
          });
          pages.push({
            id,
            url: page.url(),
            status: response?.status() ?? null,
            capturedAt: new Date().toISOString(),
            text,
            links,
            screenshot,
            screenshotSha256: createHash("sha256").update(png).digest("hex"),
          });
          await writeFile(
            join(directory, `${id}.json`),
            JSON.stringify(pages.at(-1), null, 2),
          );
          sample();
          await event({ type: "page_captured", pageId: id, url });
        }
      }
    }
  } catch (cause) {
    if (!stopped()) state = pages.length ? "partial" : "failed";
    error = cause instanceof Error ? cause.message : String(cause);
  } finally {
    clearTimeout(timer);
    clearInterval(sampler);
    options.signal?.removeEventListener("abort", interrupt);
    await browser?.close();
    await fixture?.close();
  }
  stopped();
  const result = {
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
