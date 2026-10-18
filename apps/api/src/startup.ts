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
    "blockedRequests",
    "offOriginRequestsReceived",
    "offOriginRequestDiagnostics",
    "memoryMeasurement",
    "cgroupMemory",
  ];
  const probe = {
    ...Object.fromEntries(fields.map((key) => [key, result[key]])),
    chromiumSandboxRequested: result.chromiumSandbox,
    evidenceCount: Array.isArray(result.pages) ? result.pages.length : 0,
    evidenceStatuses: Array.isArray(result.pages)
      ? result.pages.slice(0, 3).map((page: unknown) => {
          const status =
            page && typeof page === "object" && "status" in page
              ? page.status
              : null;
          return typeof status === "number" &&
            Number.isInteger(status) && status >= 100 && status <= 599
            ? status
            : null;
        })
      : [],
  };
  write(
    JSON.stringify({
      message:
        "Controlled fixture feasibility result; not a public-site isolation certification",
      probe,
    }),
  );
}
