import { chromium, type Browser, type BrowserContext } from "playwright";
import config from "@/lib/config";
import { logger } from "@/lib/logger";

export interface LaunchedBrowser {
  browser: Browser;
  context: BrowserContext;
}

let browserCounter = 0;

/**
 * Launch a headless Chromium browser instance configured for
 * server-side page investigation.
 *
 * - Headless mode (configurable)
 * - No sandbox (required for Docker / server environments)
 * - GPU, shared memory, and extensions disabled for stability
 * - Default viewport: 1440×900
 */
export async function launchBrowser(): Promise<LaunchedBrowser> {
  const id = ++browserCounter;
  logger.debug("Launching browser instance", { id });

  const browser = await chromium.launch({
    headless: config.browser.headless,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-sync",
      "--disable-extensions",
      "--disable-component-extensions-with-background-pages",
      "--mute-audio",
      "--hide-scrollbars",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/125.0.0.0 Safari/537.36",
    ignoreHTTPSErrors: false,
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  logger.debug("Browser instance launched", { id });

  return { browser, context };
}
