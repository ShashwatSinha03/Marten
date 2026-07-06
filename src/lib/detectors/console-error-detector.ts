import type { Finding, FindingSeverity } from "@/types";
import type { HeuristicDetector, DetectorContext } from "./types";

const severityMap: Record<string, FindingSeverity> = {
  error: "high",
  warning: "medium",
  info: "low",
  log: "info",
  debug: "info",
};

function mapSeverity(level: string): FindingSeverity {
  return severityMap[level.toLowerCase()] ?? "info";
}

function getRecommendation(level: string): string | undefined {
  if (level === "error") {
    return "Investigate the source of the error. Check for unhandled exceptions, network failures, or missing resources.";
  }
  if (level === "warning") {
    return "Review warnings to prevent potential issues. These may indicate deprecated APIs or suboptimal patterns.";
  }
  return undefined;
}

/**
 * Detects console errors, warnings, and unhandled rejections.
 */
export const consoleErrorDetector: HeuristicDetector = {
  id: "console_error",
  name: "Console Error Detector",

  detect(ctx: DetectorContext): Finding[] {
    const findings: Finding[] = [];

    for (const log of ctx.evidence.consoleLogs) {
      const entries = (log.metadata as { entries?: Array<{ level: string; message: string; source: string }> })
        ?.entries ?? [];

      // Group by normalized message + source.
      const groups = new Map<string, Array<typeof entries[0]>>();

      for (const entry of entries) {
        const key = `${entry.level}:${entry.message.slice(0, 100)}:${entry.source}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(entry);
      }

      for (const [, group] of groups) {
        const entry = group[0];
        const severity = mapSeverity(entry.level);
        const count = group.length;

        const finding: Finding = {
          id: crypto.randomUUID(),
          investigationId: "",
          title: `${entry.level.toUpperCase()}: ${entry.message.slice(0, 80)}`,
          description: `Console ${entry.level} detected (×${count}) at ${entry.source || "unknown source"}. ${entry.message}`,
          severity,
          category: "console_error",
          confidence: 0.9,
          source: "heuristic",
          evidenceRefs: [{ type: "console_log", id: log.id }],
          isLowConfidence: false,
          recommendation: getRecommendation(entry.level),
          createdAt: new Date().toISOString(),
        };

        findings.push(finding);
      }
    }

    return findings;
  },
};
