import { URL } from "node:url";
import dns from "node:dns/promises";
import config from "@/lib/config";

// ─── Types ─────────────────────────────────────────────────────────

export interface ReachabilityResult {
  reachable: boolean;
  statusCode?: number;
  finalUrl?: string;
  redirectChain?: string[];
}

export class UrlValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "UrlValidationError";
  }
}

// ─── Tracking param patterns ───────────────────────────────────────

const TRACKING_PARAMS = [
  /^utm_/i,
  /^fbclid$/i,
  /^gclid$/i,
  /^gclsrc$/i,
  /^dclid$/i,
  /^msclkid$/i,
  /^twclid$/i,
  /^igshid$/i,
  /^mc_cid$/i,
  /^mc_eid$/i,
];

// ─── Public API ────────────────────────────────────────────────────

/**
 * Normalize a URL for consistent investigation:
 * - Adds `https://` if no protocol is present
 * - Strips the fragment (hash)
 * - Strips common tracking parameters
 * - Strips embedded credentials
 * - Punycode-encodes the hostname
 */
export function normalizeUrl(raw: string): string {
  let urlStr = raw.trim();

  // Add protocol if missing.
  if (!/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(urlStr)) {
    urlStr = `https://${urlStr}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new UrlValidationError("Malformed URL", "MALFORMED_URL");
  }

  // Strip fragment.
  parsed.hash = "";

  // Strip credentials.
  parsed.username = "";
  parsed.password = "";

  // Strip tracking params.
  const cleanSearch = new URLSearchParams();
  for (const [key, value] of parsed.searchParams.entries()) {
    const isTracking = TRACKING_PARAMS.some((p) => p.test(key));
    if (!isTracking) {
      cleanSearch.append(key, value);
    }
  }
  parsed.search = cleanSearch.toString();

  // Punycode hostname.
  try {
    parsed.hostname = new URL(parsed.href).hostname;
  } catch {
    // If punycode fails, leave as-is.
  }

  return parsed.toString();
}

/**
 * Validate a URL for investigation.
 *
 * Checks:
 * - Well-formed URL
 * - Allowed protocol (http / https only)
 * - Rejects internal / private IPs (SSRF protection via DNS)
 * - Rejects malicious schemes
 *
 * @throws {UrlValidationError} on validation failure.
 */
export async function validateUrl(raw: string): Promise<string> {
  let urlStr = raw.trim();

  if (!/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(urlStr)) {
    urlStr = `https://${urlStr}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new UrlValidationError("Malformed URL", "MALFORMED_URL");
  }

  // Protocol check.
  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") {
    throw new UrlValidationError(
      `Protocol "${protocol}" is not allowed. Only http/https are supported.`,
      "INVALID_PROTOCOL",
    );
  }

  // Block malicious schemes embedded in the URL.
  const blockedSchemes = ["file:", "data:", "javascript:", "vbscript:", "blob:"];
  for (const scheme of blockedSchemes) {
    if (urlStr.toLowerCase().startsWith(scheme)) {
      throw new UrlValidationError(
        `URL uses blocked scheme "${scheme}"`,
        "BLOCKED_SCHEME",
      );
    }
  }

  // SSRF: resolve hostname and check for private/internal IPs.
  const hostname = parsed.hostname;

  // Skip IP check for localhost in dev mode.
  const isLocalhost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  if (isLocalhost && config.app.isDev) {
    return parsed.toString();
  }
  if (isLocalhost && !config.app.isDev) {
    throw new UrlValidationError("Localhost URLs are not allowed", "PRIVATE_IP");
  }

  try {
    const addresses = await dns.resolve4(hostname);
    for (const ip of addresses) {
      if (isPrivateIp(ip)) {
        throw new UrlValidationError(
          `URL resolves to a private IP (${ip})`,
          "PRIVATE_IP",
        );
      }
    }
  } catch (err) {
    if (err instanceof UrlValidationError) throw err;
    // DNS failure may be transient; allow through but log.
  }

  return parsed.toString();
}

/**
 * Check whether a URL is reachable via HEAD request.
 */
export async function checkReachability(url: string): Promise<ReachabilityResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "manual",
      headers: {
        "User-Agent": "Marten/1.0 Investigation Bot",
      },
    });

    const redirectChain: string[] = [];
    let finalUrl = url;

    // Follow redirects manually to build the chain.
    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.has("location")
    ) {
      const location = new URL(response.headers.get("location")!, url).toString();
      redirectChain.push(location);
      finalUrl = location;
    }

    return {
      reachable: response.ok || response.status < 500,
      statusCode: response.status,
      finalUrl,
      redirectChain: redirectChain.length > 0 ? redirectChain : undefined,
    };
  } catch {
    return { reachable: false };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── SSRF helper (shared with ssrf.ts) ────────────────────────────

/**
 * Check if an IP address falls within a private / reserved range.
 */
export function isPrivateIp(ip: string): boolean {
  // IPv4-mapped IPv6.
  const normalized = ip.replace(/^::ffff:/, "");

  // IPv6 loopback / unspecified.
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
  if (normalized === "0.0.0.0") return true;

  // IPv4 checks.
  const parts = normalized.split(".").map(Number);
  if (parts.length !== 4) return false;
  if (parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return false;

  const [a, b, c, d] = parts;

  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 127.0.0.0/8
  if (a === 127) return true;
  // 169.254.0.0/16 (link-local)
  if (a === 169 && b === 254) return true;
  // 224.0.0.0/4 (multicast)
  if (a >= 224 && a <= 239) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 198.18.0.0/15 (benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;

  return false;
}
