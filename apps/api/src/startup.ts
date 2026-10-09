/** Emit only operational fixture measurements; never page content or raw errors. */
export function logStartupProbe(
  result: Record<string, unknown>,
  write: (line: string) => void = console.info,
) {
  const fields = [
    "state",
    "elapsedMs",
    "peakNodeRssBytes",
    "peakProcessTreeRssBytes",
    "browserClosed",
    "chromiumSandbox",
    "blockedRequests",
    "offOriginRequestsReceived",
    "memoryMeasurement",
  ];
  const probe = Object.fromEntries(fields.map((key) => [key, result[key]]));
  write(
    JSON.stringify({
      message:
        "Controlled fixture feasibility result; not a public-site isolation certification",
      probe,
    }),
  );
}
