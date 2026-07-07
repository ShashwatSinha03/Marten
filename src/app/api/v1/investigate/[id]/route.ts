import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { investigationRepo } from "@/lib/repositories/investigation.repository";
import { evidenceRepo } from "@/lib/repositories/evidence.repository";
import { eventRepo } from "@/lib/repositories/event.repository";
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

    const investigation = await investigationRepo.findById(id);

    if (!investigation) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Investigation not found" } },
        { status: 404 },
      );
    }

    const inv = investigation;

    // Ensure the user owns this investigation.
    if (inv.userId?.toString() !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized to view this investigation" } },
        { status: 403 },
      );
    }

    // Count related records for the _count field.
    const [evidenceItems, events] = await Promise.all([
      evidenceRepo.findByInvestigationId(id),
      eventRepo.findAfterSequence(id, 0),
    ]);

    const findingCount = (inv.report?.findings?.length) ?? 0;

    const investigationData = {
      id: inv._id!.toString(),
      url: inv.url,
      normalizedUrl: inv.normalizedUrl,
      depth: inv.depth,
      status: inv.status,
      progress: inv.progress,
      error: inv.error,
      errorCode: inv.errorCode,
      userId: inv.userId?.toString(),
      metadata: inv.metadata,
      startedAt: inv.startedAt,
      completedAt: inv.completedAt,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
      _count: {
        evidence: evidenceItems.length,
        findings: findingCount,
        events: events.length,
      },
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
