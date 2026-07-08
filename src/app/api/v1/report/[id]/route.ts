import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { investigationRepo } from "@/lib/repositories/investigation.repository";
import type { ReportData } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }

    const { id } = await params;

    const investigation = await investigationRepo.findByReportId(id);

    if (!investigation || !investigation.report) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Report not found" } },
        { status: 404 },
      );
    }

    const inv = investigation;

    if (inv.userId?.toString() !== userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 },
      );
    }

    const report = investigation.report;

    const reportData: ReportData = {
      id: report.reportId,
      investigationId: inv._id!.toString(),
      summary: report.summary,
      overallScore: report.overallScore,
      findingCount: report.findingCount,
      criticalCount: report.criticalCount,
      highCount: report.highCount,
      mediumCount: report.mediumCount,
      lowCount: report.lowCount,
      infoCount: report.infoCount,
      findings: (report.findings ?? []) as unknown as ReportData["findings"],
      metadata: {
        url: inv.url,
        depth: inv.depth as "quick" | "standard",
        duration: 0,
        completedAt: inv.completedAt instanceof Date ? inv.completedAt.toISOString() : inv.completedAt ?? "",
      },
    };

    return NextResponse.json({ data: reportData });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch report";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
