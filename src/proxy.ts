import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const API_RATE_LIMIT = 10; // requests per minute per IP
const RATE_WINDOW_MS = 60_000; // 1 minute

interface RateEntry {
  count: number;
  resetAt: number;
}

const rateMap = new Map<string, RateEntry>();

// Clean up stale entries periodically.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateMap) {
    if (entry.resetAt < now) {
      rateMap.delete(key);
    }
  }
}, 60_000);

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith("/api/auth/");
}

function isPublicRoute(pathname: string): boolean {
  const publicPrefixes = [
    "/_next",
    "/favicon.ico",
    "/api/auth",
    "/share",
  ];
  return publicPrefixes.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1";

  // ── Security headers ──────────────────────────────────────────
  const headers = new Headers({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });

  // CSP for API routes.
  if (isApiRoute(pathname)) {
    headers.set(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'none'; connect-src 'self'; base-uri 'none'; form-action 'none'",
    );
  }

  // HSTS for non-dev environments.
  if (process.env.NODE_ENV === "production") {
    headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  // ── Rate limiting (API routes only) ────────────────────────────
  if (isApiRoute(pathname) && !isAuthRoute(pathname)) {
    const now = Date.now();
    const entry = rateMap.get(ip);

    if (entry && entry.resetAt > now) {
      entry.count++;
      if (entry.count > API_RATE_LIMIT) {
        return new NextResponse(
          JSON.stringify({
            error: {
              code: "RATE_LIMITED",
              message: "Too many requests. Please try again later.",
            },
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
              ...Object.fromEntries(headers),
            },
          },
        );
      }
    } else {
      rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    }

    // Add rate limit headers.
    const currentEntry = rateMap.get(ip)!;
    headers.set("X-RateLimit-Limit", String(API_RATE_LIMIT));
    headers.set("X-RateLimit-Remaining", String(Math.max(0, API_RATE_LIMIT - currentEntry.count)));
    headers.set("X-RateLimit-Reset", String(Math.ceil(currentEntry.resetAt / 1000)));
  }

  // ── Auth check ─────────────────────────────────────────────────
  if (isApiRoute(pathname) && !isAuthRoute(pathname) && !isPublicRoute(pathname)) {
    const token = await getToken({ req: request });

    if (!token) {
      // Check if it's an HTML request (browser navigation) vs API.
      const accept = request.headers.get("accept") ?? "";
      if (accept.includes("text/html")) {
        const signInUrl = new URL("/sign-in", request.url);
        signInUrl.searchParams.set("callbackUrl", request.url);
        return NextResponse.redirect(signInUrl);
      }

      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401, headers },
      );
    }
  }

  // Apply headers to all responses.
  const response = NextResponse.next();
  for (const [key, value] of headers) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
