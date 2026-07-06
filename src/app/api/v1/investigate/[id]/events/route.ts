import { type NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createSseStream } from "@/lib/sse/stream";
import { logger } from "@/lib/logger";

/**
 * GET /api/v1/investigate/[id]/events
 *
 * SSE stream for real-time investigation updates.
 *
 * Query params:
 *   - lastEventId: number — for reconnection replay.
 *
 * Headers:
 *   - Accept: text/event-stream
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Auth check.
  const session = await getServerSession();
  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Verify investigation exists and user owns it.
  const investigation = await prisma.investigation.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!investigation) {
    return new Response(
      JSON.stringify({ error: { code: "NOT_FOUND", message: "Investigation not found" } }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (investigation.userId !== session.user.id) {
    return new Response(
      JSON.stringify({ error: { code: "FORBIDDEN", message: "Not authorized" } }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Parse Last-Event-ID from query or header.
  const lastEventId =
    request.nextUrl.searchParams.get("lastEventId") ??
    request.headers.get("last-event-id") ??
    undefined;

  const stream = createSseStream(id, lastEventId);

  logger.info("SSE stream connected", { investigationId: id });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
