import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getBrowserAuth } from "@gitreqd/browser-auth";

/**
 * GRD-AUTH-003: Delegates to `@gitreqd/browser-auth` (no-op stub in this repository).
 * When `GITREQD_BROWSER_AUTH_TEST=1`, `/api/*` expects `Authorization: Bearer test-token` (CLI tests).
 */
export async function middleware(request: NextRequest) {
  if (process.env.GITREQD_BROWSER_AUTH_TEST === "1" && request.nextUrl.pathname.startsWith("/api")) {
    const auth = request.headers.get("authorization");
    if (auth !== "Bearer test-token") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Missing or invalid token." } },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }
  const browserAuth = getBrowserAuth();
  if (!browserAuth.isLoginRequired()) {
    return NextResponse.next();
  }
  return browserAuth.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
