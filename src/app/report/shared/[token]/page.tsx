import { ReportContainer, ReportHeader, ReportSummary, FindingsList, InvestigationLog } from "@/components/report";
import type { ReportData } from "@/types";

// In production, this would fetch the shared report by token
const placeholderReport: ReportData = {
  id: "rpt-shared-1",
  investigationId: "inv-1",
  summary:
    "Shared investigation report. This is a public view of the investigation results.",
  overallScore: 68,
  findingCount: 12,
  criticalCount: 2,
  highCount: 3,
  mediumCount: 4,
  lowCount: 2,
  infoCount: 1,
  findings: [],
  metadata: {
    url: "https://example.com/ai-dashboard",
    depth: "standard",
    duration: 145000,
    completedAt: new Date().toISOString(),
  },
};

export default function SharedReportPage() {
  const report = placeholderReport;

  const severityCounts = {
    critical: report.criticalCount,
    high: report.highCount,
    medium: report.mediumCount,
    low: report.lowCount,
    info: report.infoCount,
  };

  return (
    <ReportContainer>
      <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/5 border border-accent/10 text-xs text-accent">
        Shared Report
      </div>

      <ReportHeader
        url={report.metadata.url}
        depth={report.metadata.depth}
        date={report.metadata.completedAt}
        duration={report.metadata.duration}
        findingCount={report.findingCount}
      />

      <ReportSummary summary={report.summary} severityCounts={severityCounts} />

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4 font-display">
          Findings
        </h2>
        <FindingsList findings={report.findings} />
      </div>
    </ReportContainer>
  );
}
