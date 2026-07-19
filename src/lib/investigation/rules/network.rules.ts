import { ruleRegistry } from "../rule-registry";
import type { Rule, InvestigationContext, RuleMatch } from "../types";

// ── failed-request ──────────────────────────────────────────────────

const failedRequestRule: Rule = {
  identifier: "network/failed-request",
  description: "4xx or 5xx status codes in network logs",
  category: "network",
  defaultSeverity: "high",
  documentation:
    "Detects failed HTTP requests with client or server error status codes.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const evidence = ctx.evidence;
    const results: RuleMatch[] = [];

    for (const net of evidence.networkLogs) {
      const entries = (net.metadata as { entries?: Array<{ url: string; method: string; status: number; type: string; timing: number }> })
        ?.entries ?? [];

      const failed = entries.filter((e) => e.status >= 400);

      if (failed.length > 0) {
        const statusGroups = new Map<number, number>();
        for (const f of failed) {
          statusGroups.set(f.status, (statusGroups.get(f.status) ?? 0) + 1);
        }

        for (const [status, count] of statusGroups) {
          const severity = status >= 500 ? "critical" as const : status === 401 || status === 403 ? "high" as const : "medium" as const;
          results.push({
            fingerprint: `network/failed-request:${status}:${count}`,
            title: `HTTP ${status} errors (×${count})`,
            description: `${count} request(s) returned HTTP ${status}. ${
              status >= 500
                ? "Server errors indicate backend issues."
                : "Client errors indicate missing resources or auth issues."
            }`,
            severity,
            evidenceIds: [net.id],
            graphNodeIds: [],
            graphEdgeIds: [],
            recommendationPlaceholder:
              status >= 500
                ? "Investigate server-side errors. Check API endpoints, server logs, and ensure backend services are healthy."
                : status === 401
                  ? "Check authentication tokens and ensure API requests include valid credentials."
                  : status === 403
                    ? "Review API permissions and ensure the client has the required authorization."
                    : "Verify resource URLs. The requested resource may have been moved or deleted.",
          });
        }
      }
    }
    return results;
  },
};

// ── redirect-chain ──────────────────────────────────────────────────

const redirectChainRule: Rule = {
  identifier: "network/redirect-chain",
  description: "Resources with 3+ consecutive redirects",
  category: "network",
  defaultSeverity: "medium",
  documentation:
    "Detects long redirect chains that hurt performance.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const evidence = ctx.evidence;
    const results: RuleMatch[] = [];

    for (const net of evidence.networkLogs) {
      const entries = (net.metadata as { entries?: Array<{ url: string; method: string; status: number; type: string; timing: number }> })
        ?.entries ?? [];

      const redirects = entries.filter(
        (e) => e.status >= 300 && e.status < 400,
      );

      if (redirects.length >= 3) {
        results.push({
          fingerprint: `network/redirect-chain:${redirects.length}`,
          title: "Long redirect chain detected",
          description: `${redirects.length} redirect(s) detected in network traffic. Long redirect chains increase page load time and can harm SEO.`,
          severity: "medium",
          evidenceIds: [net.id],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Reduce redirect chains by linking directly to the final destination URL. Update internal links to point to the canonical URL.",
        });
      }
    }
    return results;
  },
};

// ── slow-resource ───────────────────────────────────────────────────

const slowResourceRule: Rule = {
  identifier: "network/slow-resource",
  description: "Resources taking >3000ms to load",
  category: "network",
  defaultSeverity: "medium",
  documentation:
    "Detects resources with long load times that degrade performance.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const evidence = ctx.evidence;
    const results: RuleMatch[] = [];

    for (const net of evidence.networkLogs) {
      const entries = (net.metadata as { entries?: Array<{ url: string; method: string; status: number; type: string; timing: number }> })
        ?.entries ?? [];

      const slow = entries.filter((e) => e.timing > 3000);
      if (slow.length > 0) {
        const avgSlow = Math.round(
          slow.reduce((sum, e) => sum + e.timing, 0) / slow.length,
        );
        results.push({
          fingerprint: `network/slow-resource:${slow.length}:${avgSlow}`,
          title: `Slow network requests (×${slow.length})`,
          description: `${slow.length} request(s) took longer than 3s. Average slow response: ${avgSlow}ms. Slow resources degrade Core Web Vitals and user experience.`,
          severity: "medium",
          evidenceIds: [net.id],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Optimize slow endpoints. Consider caching, CDN, image optimization, and server-side performance improvements.",
        });
      }
    }
    return results;
  },
};

// ── excessive-third-party ───────────────────────────────────────────

const excessiveThirdPartyRule: Rule = {
  identifier: "network/excessive-third-party",
  description: "10+ unique third-party domains",
  category: "network",
  defaultSeverity: "low",
  documentation:
    "Detects excessive third-party resource domains that impact privacy and performance.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const evidence = ctx.evidence;
    const results: RuleMatch[] = [];

    for (const net of evidence.networkLogs) {
      const entries = (net.metadata as { entries?: Array<{ url: string; method: string; status: number; type: string; timing: number }> })
        ?.entries ?? [];

      const thirdPartyDomains = new Set<string>();
      for (const entry of entries) {
        try {
          const hostname = new URL(entry.url).hostname;
          // Skip the main domain (approximated as the first request's domain)
          if (entries.length > 0) {
            const mainHost = new URL(entries[0].url).hostname;
            if (hostname !== mainHost) {
              thirdPartyDomains.add(hostname);
            }
          }
        } catch {
          // Invalid URL, skip
        }
      }

      if (thirdPartyDomains.size >= 10) {
        results.push({
          fingerprint: `network/excessive-third-party:${thirdPartyDomains.size}`,
          title: "Excessive third-party domains",
          description: `The page loads resources from ${thirdPartyDomains.size} unique third-party domains. Excessive third-party resources impact privacy, performance, and security.`,
          severity: "low",
          evidenceIds: [net.id],
          graphNodeIds: [],
          graphEdgeIds: [],
          recommendationPlaceholder:
            "Audit third-party dependencies. Remove unused resources, self-host critical assets, and use subresource integrity (SRI) for required third-party scripts.",
        });
      }
    }
    return results;
  },
};

// ── Register ────────────────────────────────────────────────────────

ruleRegistry.register(failedRequestRule);
ruleRegistry.register(redirectChainRule);
ruleRegistry.register(slowResourceRule);
ruleRegistry.register(excessiveThirdPartyRule);

export {
  failedRequestRule,
  redirectChainRule,
  slowResourceRule,
  excessiveThirdPartyRule,
};
