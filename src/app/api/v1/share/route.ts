import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { investigationRepo } from "@/lib/repositories/investigation.repository";
import type { ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }

    interface ShareBody {
      reportId?: string;
      expiresInDays?: number;
    }

    let body: ShareBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_BODY", message: "Invalid JSON body" } },
        { status: 400 },
      );
    }

    if (!body.reportId || typeof body.reportId !== "string") {
      return NextResponse.json(
        { error: { code: "MISSING_REPORT_ID", message: "reportId is required" } },
        { status: 400 },
      );
    }

    const investigation = await investigationRepo.findByReportId(body.reportId);

    if (!investigation || !investigation.report) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Report not found" } },
        { status: 404 },
      );
    }

    if (investigation.userId?.toString() !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized to share this report" } },
        { status: 403 },
      );
    }

    const expiresInDays = Math.min(Math.max(body.expiresInDays ?? 7, 1), 90);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    const now = new Date();

    // Create share link and embed it in the report.
    const shareLink = {
      token: crypto.randomUUID().replace(/-/g, ""),
      reportId: body.reportId,
      isActive: true,
      createdAt: now,
      expiresAt,
    };

    const report = investigation.report;
    const updatedReport = {
      ...report,
      shareLinks: [...(report.shareLinks ?? []), shareLink],
      updatedAt: now,
    };
    await investigationRepo.saveReport(investigation.id, updatedReport);

    const response: ApiResponse<{ token: string; url: string; expiresAt: string | null }> = {
      data: {
        token: shareLink.token,
        url: `/share/${shareLink.token}`,
        expiresAt: shareLink.expiresAt?.toISOString() ?? null,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create share link";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
