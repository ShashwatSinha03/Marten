import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { ApiResponse } from "@/types";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }

    const { token } = await params;

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
    });

    if (!shareLink) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Share link not found" } },
        { status: 404 },
      );
    }

    // Verify ownership via the report's investigation.
    const report = await prisma.report.findUnique({
      where: { id: shareLink.reportId },
      include: {
        investigation: { select: { userId: true } },
      },
    });

    if (!report || report.investigation.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized to revoke this share link" } },
        { status: 403 },
      );
    }

    await prisma.shareLink.update({
      where: { id: shareLink.id },
      data: { isActive: false },
    });

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
