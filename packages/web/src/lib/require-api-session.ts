import { NextResponse } from "next/server";
import { getBrowserAuth } from "@gitreqd/browser-auth";

const unauthorized = NextResponse.json(
  { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
  { status: 401 }
);

/**
 * GRD-AUTH-003: Uses the pluggable auth package; enforced only when it reports login required (e.g. cloud).
 * When `GITREQD_BROWSER_AUTH_TEST=1`, the CLI test harness uses the Bearer token gate in middleware instead.
 */
export async function requireApiSession(): Promise<
  { ok: true } | { ok: false; response: NextResponse }
> {
  const browserAuth = getBrowserAuth();
  if (!browserAuth.isLoginRequired()) {
    return { ok: true };
  }
  if (process.env.GITREQD_BROWSER_AUTH_TEST === "1") {
    return { ok: true };
  }
  const session = await browserAuth.getSession();
  if (!session?.user) {
    return { ok: false, response: unauthorized };
  }
  return { ok: true };
}
