import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { ApiResponse } from "@/types";

/**
 * GET /api/v1/investigate/[id]
 *
 * Returns the current state of an investigation.
 */
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

    const investigation = await prisma.investigation.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            evidence: true,
            findings: true,
            events: true,
          },
        },
      },
    });

    if (!investigation) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Investigation not found" } },
        { status: 404 },
      );
    }

    // Ensure the user owns this investigation.
    if (investigation.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized to view this investigation" } },
        { status: 403 },
      );
    }

    const investigationData = {
      id: investigation.id,
      url: investigation.url,
      normalizedUrl: investigation.normalizedUrl,
      depth: investigation.depth,
      status: investigation.status,
      progress: investigation.progress,
      error: investigation.error,
      errorCode: investigation.errorCode,
      userId: investigation.userId,
      metadata: investigation.metadata,
      startedAt: investigation.startedAt,
      completedAt: investigation.completedAt,
      createdAt: investigation.createdAt,
      updatedAt: investigation.updatedAt,
      _count: investigation._count,
    };

    const response: ApiResponse<typeof investigationData> = {
      data: investigationData,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch investigation";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
