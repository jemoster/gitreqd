import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { isCloudAuthConfigured } from "@/lib/auth-config";

const unauthorized = NextResponse.json(
  { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
  { status: 401 }
);

/**
 * GRD-AUTH-001: Require a session when cloud Auth0 is configured.
 * When `GITREQD_BROWSER_AUTH_TEST=1`, the CLI test harness uses the Bearer token gate in middleware instead.
 */
export async function requireApiSession(): Promise<
  { ok: true } | { ok: false; response: NextResponse }
> {
  if (!isCloudAuthConfigured()) {
    return { ok: true };
  }
  if (process.env.GITREQD_BROWSER_AUTH_TEST === "1") {
    return { ok: true };
  }
  const session = await auth0.getSession();
  if (!session?.user) {
    return { ok: false, response: unauthorized };
  }
  return { ok: true };
}
