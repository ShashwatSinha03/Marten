import type { NetworkSummary } from "./types";

interface RawNetworkEntry {
  url: string;
  method: string;
  status: number;
  type: string;
  timing: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
}

/**
 * Summarize raw network request entries into aggregate statistics.
 */
export function createNetworkSummary(entries: RawNetworkEntry[]): NetworkSummary {
  const byType: Record<string, { count: number; bytes: number; timeMs: number }> = {};
  const byStatusCode: Record<string, number> = {};
  const blocked: Array<{ url: string; reason: string }> = [];
  const failed: Array<{ url: string; status: number; type: string }> = [];
  const slowest: Array<{ url: string; timeMs: number; type: string }> = [];
  const thirdPartyByDomain: Record<string, { count: number; bytes: number }> = {};

  let totalTimeMs = 0;
  let thirdPartyTotal = 0;

  // Extract base domain from first entry for "internal" detection
  const baseDomain = entries.length > 0 ? extractDomain(entries[0].url) : "";

  for (const entry of entries) {
    const type = entry.type || "other";
    const statusGroup = `${Math.floor(entry.status / 100)}xx`;

    // By type
    if (!byType[type]) {
      byType[type] = { count: 0, bytes: 0, timeMs: 0 };
    }
    byType[type].count += 1;
    byType[type].timeMs += entry.timing;

    // By status code
    byStatusCode[statusGroup] = (byStatusCode[statusGroup] ?? 0) + 1;

    // Failed requests (4xx, 5xx)
    if (entry.status >= 400) {
      failed.push({ url: entry.url, status: entry.status, type });
    }

    // Blocked (status 0 indicates request was blocked/aborted)
    if (entry.status === 0) {
      blocked.push({ url: entry.url, reason: "Request blocked or aborted" });
    }

    // Track timing for slowest
    if (entry.timing > 0) {
      totalTimeMs += entry.timing;
      slowest.push({ url: entry.url, timeMs: entry.timing, type });
    }

    // Third party tracking
    const entryDomain = extractDomain(entry.url);
    if (entryDomain && entryDomain !== baseDomain) {
      thirdPartyTotal += 1;
      if (!thirdPartyByDomain[entryDomain]) {
        thirdPartyByDomain[entryDomain] = { count: 0, bytes: 0 };
      }
      thirdPartyByDomain[entryDomain].count += 1;
    }
  }

  // Sort and top 5
  slowest.sort((a, b) => b.timeMs - a.timeMs);

  return {
    totalRequests: entries.length,
    totalBytes: 0, // Content-Length not reliably available from Playwright
    totalTimeMs,
    byType,
    byStatusCode,
    slowestRequests: slowest.slice(0, 5),
    largestRequests: [], // Content-Length not reliably available
    failedRequests: failed.slice(0, 20),
    blockedRequests: blocked.slice(0, 10),
    thirdParty: {
      total: thirdPartyTotal,
      byDomain: thirdPartyByDomain,
    },
  };
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
