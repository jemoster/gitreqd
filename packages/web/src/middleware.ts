import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GRD-AUTH-003: Optional gate for `/api/*` when enabled by env (e.g. tests).
 * Default local dev (`gitreqd browser`) does not set this.
 */
export function middleware(request: NextRequest) {
  if (process.env.GITREQD_BROWSER_AUTH_TEST === "1" && request.nextUrl.pathname.startsWith("/api")) {
    const auth = request.headers.get("authorization");
    if (auth !== "Bearer test-token") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Missing or invalid token." } },
        { status: 401 }
      );
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
