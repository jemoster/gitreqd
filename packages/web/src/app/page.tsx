import { Suspense } from "react";
import { auth0 } from "@/lib/auth0";
import { BrowserApp } from "@/components/BrowserApp";
import { isCloudAuthConfigured } from "@/lib/auth-config";

/** GRD-UI-004: Next.js App Router shell for the browser UI. GRD-AUTH-001: OAuth session gate when Auth0 env is set. */
export default async function HomePage() {
  const isAuthTest = process.env.GITREQD_BROWSER_AUTH_TEST === "1";
  if (isAuthTest) {
    return (
      <Suspense fallback={<div className="status">Loading…</div>}>
        <BrowserApp userLabel="Test" showLogout={false} />
      </Suspense>
    );
  }

  if (isCloudAuthConfigured()) {
    const session = await auth0.getSession();
    if (!session?.user) {
      return (
        <main className="auth-gate">
          <h1 className="auth-gate-title">gitreqd browser</h1>
          <p>Sign in to browse requirements in this project.</p>
          <p>
            <a className="auth-gate-link" href="/auth/login">
              Sign in
            </a>
          </p>
        </main>
      );
    }
    const label = session.user.email ?? session.user.name ?? "Signed in";
    return (
      <Suspense fallback={<div className="status">Loading…</div>}>
        <BrowserApp userLabel={label} showLogout />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="status">Loading…</div>}>
      <BrowserApp />
    </Suspense>
  );
}
