import { hasGitreqdProjectRoot } from "@gitreqd/browser-server";
import { NextResponse } from "next/server";
import { getBrowserAuth } from "@gitreqd/browser-auth";

const unauthorized = NextResponse.json(
  { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
  { status: 401 }
);

function isAuth0EnvComplete(): boolean {
  return Boolean(
    process.env.AUTH0_DOMAIN?.trim() &&
      process.env.AUTH0_CLIENT_ID?.trim() &&
      process.env.AUTH0_CLIENT_SECRET?.trim() &&
      process.env.AUTH0_SECRET?.trim()
  );
}

function authNotConfiguredOnVercel(): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "AUTH_NOT_CONFIGURED",
        message:
          "Auth0 is not configured for this deployment. In the Vercel project, add AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, and AUTH0_SECRET for the Preview environment (and Production), then redeploy. Preview deployments do not inherit Production-only env vars by default.",
      },
    },
    { status: 503 }
  );
}

function projectRootMissing(): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "CONFIG",
        message:
          "GITREQD_PROJECT_ROOT is not set and no project root was found (set the variable or ensure gitreqd.yaml exists above the app directory on Vercel).",
      },
    },
    { status: 503 }
  );
}

function requireProjectRootOrOk():
  | { ok: true }
  | { ok: false; response: NextResponse } {
  if (!hasGitreqdProjectRoot()) {
    return { ok: false, response: projectRootMissing() };
  }
  return { ok: true };
}

/**
 * GRD-AUTH-003: Uses the pluggable auth package; enforced when it reports login required (e.g. cloud with Auth0).
 * On Vercel, APIs never run unauthenticated: missing Auth0 env yields 503 (misconfiguration), not 500 from loaders.
 * Project root uses GITREQD_PROJECT_ROOT or discovery of gitreqd.yaml (see @gitreqd/browser-server).
 * When `GITREQD_BROWSER_AUTH_TEST=1`, the CLI test harness uses the Bearer token gate in middleware instead.
 */
export async function requireApiSession(): Promise<
  { ok: true } | { ok: false; response: NextResponse }
> {
  const browserAuth = getBrowserAuth();

  if (process.env.VERCEL === "1" && !isAuth0EnvComplete()) {
    return { ok: false, response: authNotConfiguredOnVercel() };
  }

  if (!browserAuth.isLoginRequired()) {
    return requireProjectRootOrOk();
  }
  if (process.env.GITREQD_BROWSER_AUTH_TEST === "1") {
    return requireProjectRootOrOk();
  }
  const session = await browserAuth.getSession();
  if (!session?.user) {
    return { ok: false, response: unauthorized };
  }
  return requireProjectRootOrOk();
}
