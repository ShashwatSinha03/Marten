import { RequestError } from "./request";
type TokenResult = { data: { token?: string } | null; error: unknown };
export async function requireAccessToken(
  token: (options: { fetchOptions: { signal: AbortSignal } }) => Promise<TokenResult>,
  signal: AbortSignal,
) {
  const result = await token({ fetchOptions: { signal } });
  if (result.error || !result.data?.token?.trim()) throw new RequestError("UNAUTHORIZED", "Your session has expired. Sign in again to continue.");
  signal.throwIfAborted();
  return result.data.token;
}
