import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "./lib/auth-server";
export default async function proxy(request: NextRequest) {
  const auth = getAuth();
  if (!auth) return NextResponse.redirect(new URL("/", request.url));
  return auth.middleware({ loginUrl: "/" })(request);
}
export const config = { matcher: ["/auth/callback"] };
