import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { ApiResponse, ReportData, Finding } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
    });

    if (!shareLink || !shareLink.isActive) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Share link not found or has been revoked" } },
        { status: 404 },
      );
    }

    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      return NextResponse.json(
        { error: { code: "EXPIRED", message: "Share link has expired" } },
        { status: 410 },
      );
    }

    const report = await prisma.report.findUnique({
      where: { id: shareLink.reportId },
    });

    if (!report) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Report not found" } },
        { status: 404 },
      );
    }

    const investigation = await prisma.investigation.findUnique({
      where: { id: report.investigationId },
      select: { url: true, depth: true, completedAt: true },
    });

    if (!investigation) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Investigation not found" } },
        { status: 404 },
      );
    }

    const findings = await prisma.finding.findMany({
      where: { investigationId: report.investigationId },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    });

    const mappedFindings: Finding[] = findings.map((f) => ({
      id: f.id,
      investigationId: f.investigationId,
      title: f.title,
      description: f.description,
      severity: f.severity as Finding["severity"],
      category: f.category as Finding["category"],
      confidence: f.confidence,
      source: f.source as Finding["source"],
      evidenceRefs: (f.evidenceRefs as unknown as Finding["evidenceRefs"]) ?? [],
      metadata: (f.metadata as Record<string, unknown>) ?? undefined,
      isLowConfidence: f.isLowConfidence,
      fingerprint: f.fingerprint ?? undefined,
      createdAt: f.createdAt.toISOString(),
    }));

    const reportData: ReportData = {
      id: report.id,
      investigationId: report.investigationId,
      summary: report.summary,
      overallScore: report.overallScore,
      findingCount: report.findingCount,
      criticalCount: report.criticalCount,
      highCount: report.highCount,
      mediumCount: report.mediumCount,
      lowCount: report.lowCount,
      infoCount: report.infoCount,
      findings: mappedFindings,
      metadata: {
        url: investigation.url,
        depth: investigation.depth as "quick" | "standard",
        duration: 0,
        completedAt: investigation.completedAt?.toISOString() ?? "",
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
