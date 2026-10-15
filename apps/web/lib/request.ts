export class RequestError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

// Includes response-body consumption: a server can send headers then stall.
export async function boundedRequest<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs = 75_000,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new RequestError("TIMEOUT", "The service took too long to respond. It may be waking up. Check your connection and try again."));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError("NETWORK_ERROR", "Marten could not reach the service. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
}
