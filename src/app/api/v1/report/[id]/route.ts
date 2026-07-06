import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { ReportData, Finding } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }

    const { id } = await params;

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Report not found" } },
        { status: 404 },
      );
    }

    const investigation = await prisma.investigation.findUnique({
      where: { id: report.investigationId },
      select: { id: true, url: true, depth: true, userId: true, completedAt: true },
    });

    if (!investigation) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Investigation not found" } },
        { status: 404 },
      );
    }

    if (investigation.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 },
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

    return NextResponse.json({ data: reportData });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch report";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
