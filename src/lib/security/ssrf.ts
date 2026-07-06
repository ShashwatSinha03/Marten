import dns from "node:dns/promises";
import { isPrivateIp } from "@/lib/validators/url";

/**
 * SSRF (Server-Side Request Forgery) protection utilities.
 *
 * Validates that a hostname does not resolve to a private or reserved
 * IP address before the application makes outbound HTTP requests.
 */

export class SsrfError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly hostname: string,
    public readonly resolvedIp?: string,
  ) {
    super(message);
    this.name = "SsrfError";
  }
}

/**
 * Resolve a hostname and validate that none of its A records point to
 * a private / reserved IP range.
 *
 * @param hostname - The hostname to resolve (e.g. "example.com").
 * @returns The resolved IP address string if valid.
 * @throws {SsrfError} if the hostname resolves to a blocked IP.
 */
export async function resolveAndValidate(hostname: string): Promise<string> {
  let addresses: string[];

  try {
    const v4 = await dns.resolve4(hostname);
    addresses = v4;
  } catch {
    // Try AAAA (IPv6) if A record resolution fails.
    try {
      const v6 = await dns.resolve6(hostname);
      addresses = v6;
    } catch {
      throw new SsrfError(
        `Could not resolve hostname: ${hostname}`,
        "DNS_RESOLUTION_FAILED",
        hostname,
      );
    }
  }

  for (const ip of addresses) {
    if (isPrivateIp(ip)) {
      throw new SsrfError(
        `Hostname "${hostname}" resolves to blocked IP range: ${ip}`,
        "PRIVATE_IP",
        hostname,
        ip,
      );
    }
  }

  return addresses[0];
}

/**
 * Check if a full URL should be allowed for outbound requests.
 * Resolves the hostname and validates the IP.
 *
 * @param urlString - The full URL to validate.
 * @throws {SsrfError} if the URL hostname resolves to a blocked IP.
 */
export async function validateUrlForRequest(urlString: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new SsrfError("Malformed URL", "MALFORMED_URL", urlString);
  }

  const hostname = parsed.hostname;

  // Skip checks for localhost in dev.
  if (
    process.env.NODE_ENV === "development" &&
    (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1")
  ) {
    return;
  }

  // Skip if hostname is already an IP — check directly.
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipPattern.test(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new SsrfError(
        `IP "${hostname}" is in a private/reserved range`,
        "PRIVATE_IP",
        hostname,
        hostname,
      );
    }
    return;
  }

  await resolveAndValidate(hostname);
}
