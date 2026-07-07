import { NextResponse } from "next/server";
import { evidencePipeline } from "@/lib/evidence/evidence-pipeline";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, depth } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: { code: "INVALID_URL", message: "A valid URL is required." } },
        { status: 400 },
      );
    }

    if (depth !== "quick" && depth !== "standard") {
      return NextResponse.json(
        { error: { code: "INVALID_DEPTH", message: 'Depth must be "quick" or "standard".' } },
        { status: 400 },
      );
    }

    // Normalize URL
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

    // Start real evidence pipeline
    const { investigationId } = await evidencePipeline.start(normalizedUrl, depth);

    return NextResponse.json(
      {
        investigationId,
        streamUrl: `/api/v1/investigations/${investigationId}/stream`,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to start investigation." } },
      { status: 500 },
    );
  }
}
