import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { orchestrator } from "@/lib/pipeline/orchestrator";
import type { ApiResponse } from "@/types";

/**
 * POST /api/v1/investigate/[id]/cancel
 *
 * Gracefully cancel an in-progress investigation.
 */
export async function POST(
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
      select: { id: true, userId: true, status: true },
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

    if (
      investigation.status === "complete" ||
      investigation.status === "aborted" ||
      investigation.status === "failed"
    ) {
      return NextResponse.json(
        { error: { code: "INVALID_STATE", message: `Cannot cancel investigation in "${investigation.status}" state` } },
        { status: 409 },
      );
    }

    await orchestrator.cancel(id);

    const response: ApiResponse<{ cancelled: boolean }> = {
      data: { cancelled: true },
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to cancel investigation";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
