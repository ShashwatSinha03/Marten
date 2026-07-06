// Placeholder API route for investigation details
// In production, this would return investigation data from the database

import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Investigation not found." } },
      { status: 404 }
    );
  }

  // In production: fetch from DB
  return NextResponse.json({
    id,
    url: "https://example.com",
    depth: "quick",
    status: "pending",
  });
}
