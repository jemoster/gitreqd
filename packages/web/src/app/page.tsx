import { Suspense } from "react";
import { getBrowserAuth, UnauthenticatedLanding } from "@gitreqd/browser-auth";
import { BrowserApp } from "@/components/BrowserApp";

/** Avoid prerendering session-dependent shell at build time when auth may be configured at runtime. */
export const dynamic = "force-dynamic";

/** GRD-UI-004: Next.js App Router shell; optional login when the auth adapter requires it. */
export default async function HomePage() {
  const isAuthTest = process.env.GITREQD_BROWSER_AUTH_TEST === "1";
  if (isAuthTest) {
    return (
      <Suspense fallback={<div className="status">Loading…</div>}>
        <BrowserApp userLabel="Test" showLogout={false} />
      </Suspense>
    );
  }

  const browserAuth = getBrowserAuth();
  if (browserAuth.isLoginRequired()) {
    const session = await browserAuth.getSession();
    if (!session?.user) {
      /** GRD-AUTH-004: Shell from `@gitreqd/browser-auth` (cloud implementation or stub). */
      return <UnauthenticatedLanding />;
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
