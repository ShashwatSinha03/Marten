import { ReportContainer, ReportHeader, ReportSummary, FindingsList, EvidenceGallery, GraphSection, InvestigationLog, ExportMenu, ShareDialog } from "@/components/report";
import type { ReportData } from "@/types";

// In production, this would fetch from an API
const placeholderReport: ReportData = {
  id: "rpt-1",
  investigationId: "inv-1",
  summary:
    "This investigation identified 12 findings across the target interface, including 2 critical issues related to console errors and inaccessible interactive elements. The DOM structure analysis revealed several semantic HTML violations, and the network audit uncovered unoptimized asset loading patterns. Overall, the interface shows moderate compliance with web standards.",
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

export default function ReportPage() {
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
      <ReportHeader
        url={report.metadata.url}
        depth={report.metadata.depth}
        date={report.metadata.completedAt}
        duration={report.metadata.duration}
        findingCount={report.findingCount}
      />

      <ReportSummary summary={report.summary} severityCounts={severityCounts} />

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Findings</h2>
          <ExportMenu
            onCopyShareLink={() => {}}
            onExportPdf={() => {}}
            onExportMarkdown={() => {}}
          />
        </div>
        <FindingsList findings={report.findings} />
      </div>

      <InvestigationLog events={[]} />

      <ShareDialog
        open={false}
        onClose={() => {}}
        shareUrl=""
        onRevoke={() => {}}
      />
    </ReportContainer>
  );
}
