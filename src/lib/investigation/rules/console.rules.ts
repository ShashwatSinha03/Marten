import { ruleRegistry } from "../rule-registry";
import type { Rule, InvestigationContext, RuleMatch } from "../types";

const RESOURCE_ERROR_PATTERNS = [
  /Failed to load resource/i,
  /Loading.*failed/i,
  /Module.*error/i,
  /ChunkLoadError/i,
  /NetworkError/i,
  /ERR_/i,
  /404.*chunk/i,
  /import.*failed/i,
];

// ── js-error ────────────────────────────────────────────────────────

const jsErrorRule: Rule = {
  identifier: "console/js-error",
  description: "Console entries with level error",
  category: "console_error",
  defaultSeverity: "high",
  documentation:
    "Detects JavaScript console errors that indicate runtime issues.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const evidence = ctx.evidence;
    const results: RuleMatch[] = [];

    for (const log of evidence.consoleLogs) {
      const entries = (log.metadata as { entries?: Array<{ level: string; message: string; source: string }> })
        ?.entries ?? [];

      const errors = entries.filter(
        (e) => e.level.toLowerCase() === "error",
      );

      if (errors.length > 0) {
        // Group by normalized message
        const groups = new Map<string, typeof errors[0][]>();
        for (const err of errors) {
          const key = err.message.slice(0, 100);
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(err);
        }

        for (const [, group] of groups) {
          const entry = group[0];
          results.push({
            fingerprint: `console/js-error:${entry.message.slice(0, 80)}`,
            title: `JavaScript error: ${entry.message.slice(0, 60)}`,
            description: `Console error detected (×${group.length}) at ${entry.source || "unknown source"}: ${entry.message}`,
            severity: "high",
            evidenceIds: [log.id],
            graphNodeIds: [],
            graphEdgeIds: [],
            recommendationPlaceholder:
              "Investigate the source of the error. Check for unhandled exceptions, network failures, or missing resources.",
          });
        }
      }
    }
    return results;
  },
};

// ── excessive-warning ───────────────────────────────────────────────

const excessiveWarningRule: Rule = {
  identifier: "console/excessive-warning",
  description: "5+ warnings from the same source/domain",
  category: "console_error",
  defaultSeverity: "medium",
  documentation:
    "Detects excessive console warnings from the same source, indicating systemic issues.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const evidence = ctx.evidence;
    const results: RuleMatch[] = [];

    for (const log of evidence.consoleLogs) {
      const entries = (log.metadata as { entries?: Array<{ level: string; message: string; source: string }> })
        ?.entries ?? [];

      const warnings = entries.filter(
        (e) => e.level.toLowerCase() === "warning" || e.level.toLowerCase() === "warn",
      );

      if (warnings.length >= 5) {
        const sourceCounts = new Map<string, number>();
        for (const w of warnings) {
          const source = w.source || "unknown";
          sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
        }

        for (const [source, count] of sourceCounts) {
          if (count >= 5) {
            results.push({
              fingerprint: `console/excessive-warning:${source}:${count}`,
              title: "Excessive console warnings",
              description: `${count} warnings from "${source}". Repeated warnings indicate systemic issues that should be addressed.`,
              severity: "medium",
              evidenceIds: [log.id],
              graphNodeIds: [],
              graphEdgeIds: [],
              recommendationPlaceholder:
                "Review and fix the source of warnings. Suppress noisy but harmless warnings in production builds.",
            });
          }
        }
      }
    }
    return results;
  },
};

// ── failed-resource ─────────────────────────────────────────────────

const failedResourceRule: Rule = {
  identifier: "console/failed-resource",
  description: "Console errors related to resource loading",
  category: "console_error",
  defaultSeverity: "high",
  documentation:
    "Detects resource loading failures reported in the console.",
  execute(ctx: InvestigationContext): RuleMatch[] {
    const evidence = ctx.evidence;
    const results: RuleMatch[] = [];

    for (const log of evidence.consoleLogs) {
      const entries = (log.metadata as { entries?: Array<{ level: string; message: string; source: string }> })
        ?.entries ?? [];

      const resourceErrors = entries.filter((e) =>
        RESOURCE_ERROR_PATTERNS.some((p) => p.test(e.message)),
      );

      if (resourceErrors.length > 0) {
        const groups = new Map<string, typeof resourceErrors[0][]>();
        for (const err of resourceErrors) {
          const key = `${err.source}:${err.message.slice(0, 100)}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(err);
        }

        for (const [, group] of groups) {
          const entry = group[0];
          results.push({
            fingerprint: `console/failed-resource:${entry.source}:${entry.message.slice(0, 60)}`,
            title: "Failed resource load",
            description: `Resource loading failure (×${group.length}) at ${entry.source || "unknown source"}: ${entry.message}. Missing or broken resources break page functionality.`,
            severity: "high",
            evidenceIds: [log.id],
            graphNodeIds: [],
            graphEdgeIds: [],
            recommendationPlaceholder:
              "Ensure all referenced resources (scripts, stylesheets, images, modules) are accessible and not returning errors.",
          });
        }
      }
    }
    return results;
  },
};

// ── Register ────────────────────────────────────────────────────────

ruleRegistry.register(jsErrorRule);
ruleRegistry.register(excessiveWarningRule);
ruleRegistry.register(failedResourceRule);

export { jsErrorRule, excessiveWarningRule, failedResourceRule };
