import { RequestError } from "./request";

// Neon SDK 0.6.0-beta shares /token with its session cache. Fetch the token
// endpoint directly so a preceding useSession() cannot substitute a session.
export async function requireAccessToken(fetchToken: typeof fetch, signal: AbortSignal) {
  signal.throwIfAborted();
  const response = await fetchToken("/api/auth/token", {
    method: "GET",
    signal,
    cache: "no-store",
    credentials: "same-origin",
  });
  const body: unknown = response.ok ? await response.json().catch(() => null) : null;
  signal.throwIfAborted();
  if (!body || typeof body !== "object" || !("token" in body) || typeof body.token !== "string" || !body.token.trim()) {
    throw new RequestError("UNAUTHORIZED", "Your session has expired. Sign in again to continue.");
  }
  return body.token;
}
