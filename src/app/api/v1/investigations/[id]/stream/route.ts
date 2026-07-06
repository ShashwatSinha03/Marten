// Placeholder SSE stream endpoint
// In production, this would stream events from the investigation pipeline

export async function GET() {
  // In production: set up SSE stream
  return new Response("SSE stream endpoint placeholder", {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
