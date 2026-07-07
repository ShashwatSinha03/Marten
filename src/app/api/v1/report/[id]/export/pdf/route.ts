import { Types } from "mongoose";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { investigationRepo } from "@/lib/repositories/investigation.repository";

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

    const investigation = await investigationRepo.findByReportId(id);

    if (!investigation || !investigation.report) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Report not found" } },
        { status: 404 },
      );
    }

    if (investigation.userId?.toString() !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: { code: "NOT_IMPLEMENTED", message: "PDF export is not yet implemented" } },
      { status: 501 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
