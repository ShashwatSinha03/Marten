import { type NextRequest, NextResponse } from "next/server";
import { investigationRepo } from "@/lib/repositories/investigation.repository";
import type { ApiResponse, ReportData } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const investigation = await investigationRepo.findByShareToken(token);

    if (!investigation || !investigation.report) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Share link not found or has been revoked" } },
        { status: 404 },
      );
    }

    // Find the matching share link in the report.
    const report = investigation.report;
    const shareLink = (report.shareLinks ?? []).find(
      (sl: { token: string; isActive: boolean; expiresAt?: Date }) =>
        sl.token === token && sl.isActive !== false,
    );

    if (!shareLink) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Share link not found or has been revoked" } },
        { status: 404 },
      );
    }

    if (shareLink.expiresAt && new Date() > new Date(shareLink.expiresAt)) {
      return NextResponse.json(
        { error: { code: "EXPIRED", message: "Share link has expired" } },
        { status: 410 },
      );
    }

    const inv = investigation;

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
        completedAt: inv.completedAt instanceof Date
          ? inv.completedAt.toISOString()
          : inv.completedAt ?? "",
      },
    };

    const response: ApiResponse<ReportData> = { data: reportData };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch shared report";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
