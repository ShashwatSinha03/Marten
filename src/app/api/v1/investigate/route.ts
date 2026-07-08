import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { orchestrator } from "@/lib/pipeline/orchestrator";
import { normalizeUrl, validateUrl } from "@/lib/validators/url";
import { logger } from "@/lib/logger";
import type { ApiResponse, StartInvestigationResponse } from "@/types";

/**
 * POST /api/v1/investigate
 *
 * Start a new investigation for a target URL.
 *
 * Body: { url: string; depth?: "quick" | "standard" }
 * Response: 202 { investigationId, streamUrl }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Auth check.
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }

    // Parse and validate body.
    let body: { url?: string; depth?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_BODY", message: "Invalid JSON body" } },
        { status: 400 },
      );
    }

    if (!body.url || typeof body.url !== "string") {
      return NextResponse.json(
        { error: { code: "MISSING_URL", message: "URL is required" } },
        { status: 400 },
      );
    }

    const depth =
      body.depth === "standard" ? "standard" : "quick";

    // Validate URL before starting.
    const normalized = normalizeUrl(body.url);
    try {
      await validateUrl(normalized);
    } catch (err) {
      const message = err instanceof Error ? err.message : "URL validation failed";
      return NextResponse.json(
        { error: { code: "INVALID_URL", message } },
        { status: 400 },
      );
    }

    // Start the investigation.
    const { investigationId } = await orchestrator.start(
      normalized,
      depth,
      userId,
    );

    const response: ApiResponse<StartInvestigationResponse> = {
      data: {
        investigationId,
        streamUrl: `/api/v1/investigate/${investigationId}/events`,
      },
    };

    logger.info("Investigation API started", {
      investigationId,
      url: normalized,
      depth,
      userId: userId,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(response, { status: 202 });
  } catch (err) {
    logger.error({ err }, "Investigation start failed");

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to start investigation" } },
      { status: 500 },
    );
  }
}
