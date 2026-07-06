import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

    const where: Record<string, unknown> = {
      userId: session.user.id,
    };
    if (status) {
      where.status = status;
    }

    const [investigations, total] = await Promise.all([
      prisma.investigation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: {
              evidence: true,
              findings: true,
            },
          },
          report: {
            select: {
              id: true,
              overallScore: true,
              summary: true,
            },
          },
        },
      }),
      prisma.investigation.count({ where }),
    ]);

    const hasMore = page * pageSize < total;

    return NextResponse.json({
      data: investigations,
      meta: { total, page, pageSize, hasMore },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch investigations";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
