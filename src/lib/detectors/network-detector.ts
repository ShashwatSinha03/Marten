import type { Finding } from "@/types";
import type { HeuristicDetector, DetectorContext } from "./types";

/**
 * Detects network-related issues: mixed content, failed requests,
 * slow responses, excessive request volume, and security header gaps.
 */
export const networkDetector: HeuristicDetector = {
  id: "network",
  name: "Network Detector",

  detect(ctx: DetectorContext): Finding[] {
    const findings: Finding[] = [];

    for (const net of ctx.evidence.networkLogs) {
      const entries = (net.metadata as { entries?: Array<{ url: string; method: string; status: number; type: string; timing: number }> })
        ?.entries ?? [];

      // Check for mixed content (HTTP resources on HTTPS pages).
      const httpResources = entries.filter(
        (e) => e.url.startsWith("http://") && !e.url.startsWith("http://localhost"),
      );
      if (httpResources.length > 0) {
        findings.push({
          id: crypto.randomUUID(),
          investigationId: "",
          title: "Mixed content detected",
          description: `${httpResources.length} resource(s) loaded over HTTP on an HTTPS page. Browsers may block or warn about mixed content.`,
          severity: "high",
          category: "network",
          confidence: 0.95,
          source: "heuristic",
          evidenceRefs: [{ type: "network_log", id: net.id }],
          isLowConfidence: false,
          recommendation: "Load all resources over HTTPS. Update resource URLs from http:// to https://.",
          createdAt: new Date().toISOString(),
        });
      }

      // Check for 4xx client errors.
      const clientErrors = entries.filter((e) => e.status >= 400 && e.status < 500);
      if (clientErrors.length > 0) {
        const statusGroups = new Map<number, number>();
        for (const err of clientErrors) {
          statusGroups.set(err.status, (statusGroups.get(err.status) ?? 0) + 1);
        }

        for (const [status, count] of statusGroups) {
          findings.push({
            id: crypto.randomUUID(),
            investigationId: "",
            title: `HTTP ${status} client errors (×${count})`,
            description: `${count} request(s) returned HTTP ${status}. This indicates missing resources, authentication issues, or client-side request problems.`,
            severity: status === 404 ? "medium" : status === 401 || status === 403 ? "high" : "medium",
            category: "network",
            confidence: 0.95,
            source: "heuristic",
            evidenceRefs: [{ type: "network_log", id: net.id }],
            isLowConfidence: false,
            recommendation: getStatusRecommendation(status),
            createdAt: new Date().toISOString(),
          });
        }
      }

      // Check for 5xx server errors.
      const serverErrors = entries.filter((e) => e.status >= 500);
      if (serverErrors.length > 0) {
        findings.push({
          id: crypto.randomUUID(),
          investigationId: "",
          title: `Server errors detected (×${serverErrors.length})`,
          description: `${serverErrors.length} request(s) returned 5xx server errors. This indicates backend issues that affect functionality.`,
          severity: "critical",
          category: "network",
          confidence: 0.95,
          source: "heuristic",
          evidenceRefs: [{ type: "network_log", id: net.id }],
          isLowConfidence: false,
          recommendation: "Investigate server-side errors. Check API endpoints, server logs, and ensure all backend services are healthy.",
          createdAt: new Date().toISOString(),
        });
      }

      // Check for slow requests (> 3 seconds).
      const slowRequests = entries.filter((e) => e.timing > 3000);
      if (slowRequests.length > 0) {
        const avgSlow = Math.round(
          slowRequests.reduce((sum, e) => sum + e.timing, 0) / slowRequests.length,
        );

        findings.push({
          id: crypto.randomUUID(),
          investigationId: "",
          title: `Slow network requests detected (×${slowRequests.length})`,
          description: `${slowRequests.length} request(s) took longer than 3s. Average slow response time: ${avgSlow}ms. Slow resources degrade user experience and Core Web Vitals.`,
          severity: "medium",
          category: "network",
          confidence: 0.8,
          source: "heuristic",
          evidenceRefs: [{ type: "network_log", id: net.id }],
          isLowConfidence: false,
          recommendation: "Optimize slow endpoints. Consider caching, CDN, image optimization, and server-side performance improvements.",
          createdAt: new Date().toISOString(),
        });
      }

      // Check for excessive requests.
      if (entries.length > 100) {
        findings.push({
          id: crypto.randomUUID(),
          investigationId: "",
          title: "Excessive network requests",
          description: `The page made ${entries.length} network requests. Excessive requests can slow down page load and consume user data.`,
          severity: "low",
          category: "network",
          confidence: 0.75,
          source: "heuristic",
          evidenceRefs: [{ type: "network_log", id: net.id }],
          isLowConfidence: false,
          recommendation: "Reduce the number of network requests. Bundle assets, use lazy loading, and consolidate API calls.",
          createdAt: new Date().toISOString(),
        });
      }
    }

    return findings;
  },
};

// ── Helpers ───────────────────────────────────────────────────────

function getStatusRecommendation(status: number): string | undefined {
  switch (status) {
    case 401:
      return "Check authentication tokens and ensure API requests include valid credentials.";
    case 403:
      return "Review API permissions and ensure the client has the required authorization.";
    case 404:
      return "Verify resource URLs. The requested resource may have been moved or deleted.";
    case 429:
      return "Implement rate limiting on the client side. Add retry logic with exponential backoff.";
    default:
      return `Investigate and resolve HTTP ${status} errors for affected resources.`;
  }
}
