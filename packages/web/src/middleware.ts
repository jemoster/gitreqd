import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { isCloudAuthConfigured } from "@/lib/auth-config";

/**
 * GRD-AUTH-001: Auth0 session handling (OAuth 2.1 / OIDC) when cloud env is set.
 * GRD-AUTH-003: Optional gate for `/api/*` when `GITREQD_BROWSER_AUTH_TEST=1` (e.g. CLI tests).
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
  if (!isCloudAuthConfigured()) {
    return NextResponse.next();
  }
  return auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
