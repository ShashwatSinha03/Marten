import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { investigationRepo } from "@/lib/repositories/investigation.repository";
import type { ApiResponse } from "@/types";
import type { IReport, IShareLink } from "@/lib/mongoose/models/Investigation";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }

    const { token } = await params;

    const investigation = await investigationRepo.findByShareToken(token);

    if (!investigation || !investigation.report) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Share link not found" } },
        { status: 404 },
      );
    }

    // Verify ownership.
    if (investigation.userId?.toString() !== userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized to revoke this share link" } },
        { status: 403 },
      );
    }

    const inv = investigation;

    // Find and revoke the share link in the embedded array.
    const report = inv.report!;
    const shareLinks: IShareLink[] = report.shareLinks.map(
      (sl) =>
        sl.token === token ? { ...sl, isActive: false } : sl,
    );
    const updatedReport: IReport = {
      ...report,
      shareLinks,
      updatedAt: new Date(),
    };
    await investigationRepo.saveReport(inv._id!.toString(), updatedReport);

    const response: ApiResponse<{ revoked: boolean }> = {
      data: { revoked: true },
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to revoke share link";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
