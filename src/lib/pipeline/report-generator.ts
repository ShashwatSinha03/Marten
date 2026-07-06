import type { Finding, ReportData, FindingSeverity } from "@/types";
import { emitter } from "@/lib/sse/emitter";
import { SseEventType } from "@/lib/sse/types";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const SEVERITY_WEIGHTS: Record<FindingSeverity, number> = {
  critical: 10,
  high: 5,
  medium: 3,
  low: 1,
  info: 0,
};

/**
 * ReportGenerator aggregates findings into a structured report with
 * severity-based scoring and summary generation.
 */
export class ReportGenerator {
  /**
   * Generate a structured report from findings.
   *
   * @param investigationId - The investigation to report on.
   * @param findings        - All findings (heuristic + LLM).
   * @returns The generated ReportData.
   */
  async generate(
    investigationId: string,
    findings: Finding[],
  ): Promise<ReportData> {
    const startTime = Date.now();

    // Group findings by severity.
    const bySeverity = this.#groupBySeverity(findings);

    // Calculate overall score (0-100, lower = more issues).
    const overallScore = this.#calculateScore(findings);

    // Generate summary text.
    const summary = this.#generateSummary(findings, bySeverity);

    // Build report data.
    const reportData: Omit<ReportData, "id" | "metadata"> = {
      investigationId,
      summary,
      overallScore,
      findingCount: findings.length,
      criticalCount: bySeverity.critical?.length ?? 0,
      highCount: bySeverity.high?.length ?? 0,
      mediumCount: bySeverity.medium?.length ?? 0,
      lowCount: bySeverity.low?.length ?? 0,
      infoCount: bySeverity.info?.length ?? 0,
      findings,
    };

    // Persist to DB.
    const report = await prisma.report.create({
      data: {
        investigationId,
        summary,
        overallScore,
        findingCount: findings.length,
        criticalCount: reportData.criticalCount,
        highCount: reportData.highCount,
        mediumCount: reportData.mediumCount,
        lowCount: reportData.lowCount,
        infoCount: reportData.infoCount,
      },
    });

    const fullReport: ReportData = {
      ...reportData,
      id: report.id,
      metadata: {
        url: "",
        depth: "quick",
        duration: Date.now() - startTime,
        completedAt: new Date().toISOString(),
      },
    };

    // Emit completion event.
    emitter.emit(investigationId, {
      type: SseEventType.Complete,
      data: {
        reportId: report.id,
        overallScore,
        findingCount: findings.length,
      },
    });

    logger.info("Report generated", {
      investigationId,
      reportId: report.id,
      overallScore,
      findings: findings.length,
    });

    return fullReport;
  }

  // ── Helpers ─────────────────────────────────────────────────────

  #groupBySeverity(
    findings: Finding[],
  ): Partial<Record<FindingSeverity, Finding[]>> {
    const groups: Partial<Record<FindingSeverity, Finding[]>> = {};

    for (const finding of findings) {
      if (!groups[finding.severity]) {
        groups[finding.severity] = [];
      }
      groups[finding.severity]!.push(finding);
    }

    return groups;
  }

  #calculateScore(findings: Finding[]): number {
    if (findings.length === 0) return 100;

    let totalWeight = 0;
    for (const finding of findings) {
      totalWeight += SEVERITY_WEIGHTS[finding.severity] * (finding.confidence || 1);
    }

    // Max possible weight (all critical, max confidence).
    const maxWeight = findings.length * SEVERITY_WEIGHTS.critical * 1;

    // Score: 100 - weighted proportion.
    const rawScore = 100 - (totalWeight / Math.max(maxWeight, 1)) * 100;
    return Math.max(0, Math.min(100, Math.round(rawScore)));
  }

  #generateSummary(
    findings: Finding[],
    bySeverity: Partial<Record<FindingSeverity, Finding[]>>,
  ): string {
    if (findings.length === 0) {
      return "No issues were detected during the investigation. The interface appears to be well-constructed.";
    }

    const parts: string[] = [];

    const critical = bySeverity.critical?.length ?? 0;
    const high = bySeverity.high?.length ?? 0;
    const medium = bySeverity.medium?.length ?? 0;
    const low = bySeverity.low?.length ?? 0;

    // Severity summary.
    const severityParts: string[] = [];
    if (critical > 0) severityParts.push(`${critical} critical`);
    if (high > 0) severityParts.push(`${high} high`);
    if (medium > 0) severityParts.push(`${medium} medium`);
    if (low > 0) severityParts.push(`${low} low`);

    parts.push(
      `Found ${findings.length} issue(s): ${severityParts.join(", ")}.`,
    );

    // Top category breakdown.
    const categories = new Map<string, number>();
    for (const f of findings) {
      categories.set(f.category, (categories.get(f.category) ?? 0) + 1);
    }

    const topCategories = [...categories.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, count]) => `${count} in ${cat.replace("_", " ")}`);

    parts.push(`Most issues found: ${topCategories.join(", ")}.`);

    // Critical/High summary.
    const criticalHigh = [...(bySeverity.critical ?? []), ...(bySeverity.high ?? [])];
    if (criticalHigh.length > 0) {
      const topIssues = criticalHigh
        .slice(0, 5)
        .map((f) => f.title)
        .join("; ");
      parts.push(`Key issues: ${topIssues}.`);
    }

    // Overall assessment.
    const score = this.#calculateScore(findings);
    if (score >= 90) {
      parts.push("The interface is in good shape with minor issues.");
    } else if (score >= 70) {
      parts.push("The interface has some issues that should be addressed.");
    } else if (score >= 40) {
      parts.push("The interface has significant issues requiring attention.");
    } else {
      parts.push("The interface has critical issues that need immediate remediation.");
    }

    return parts.join(" ");
  }
}
