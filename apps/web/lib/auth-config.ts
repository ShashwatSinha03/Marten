export function readAuthConfig(env: Record<string, string | undefined>) {
  const baseUrl = env.NEON_AUTH_BASE_URL;
  const secret = env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !secret || secret.length < 32) return null;
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
  } catch { return null; }
  return { baseUrl: baseUrl.replace(/\/$/, ""), secret };
}
