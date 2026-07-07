import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { investigationRepo } from "@/lib/repositories/investigation.repository";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "10", 10)));
    const status = url.searchParams.get("status") ?? undefined;

    const result = await investigationRepo.findByUserId(session.user.id, { page, pageSize, status });

    return NextResponse.json({
      data: result.data,
      meta: { total: result.total, page: result.page, pageSize: result.pageSize, hasMore: result.hasMore },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch investigations";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
