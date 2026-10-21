import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "../../../../lib/auth-server";
type Context = { params: Promise<{ path: string[] }> };
async function handler(request: NextRequest, context: Context) {
  const auth = getAuth();
  if (!auth) return NextResponse.json({ error: { code: "NOT_CONFIGURED", message: "Sign-in is not configured." } }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return auth.handler()[request.method as "GET" | "POST"](request, context);
}
export { handler as GET, handler as POST };
