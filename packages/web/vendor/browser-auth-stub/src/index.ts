import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import React from "react";

/**
 * Session shape consumed by the gitreqd browser UI (subset of OIDC claims).
 * The base gitreqd tree ships a no-op adapter; a product deployment may replace
 * this package with one that delegates to an identity provider.
 */
export interface BrowserSession {
  user?: {
    email?: string;
    name?: string;
    sub?: string;
    [key: string]: unknown;
  };
}

/**
 * Pluggable browser auth for the Next.js app. The stub never requires login.
 */
export interface BrowserAuth {
  /** When true, the UI and API require a signed-in session. */
  isLoginRequired(): boolean;
  middleware(request: NextRequest): Promise<NextResponse>;
  getSession(): Promise<BrowserSession | null>;
}

const stubAuth: BrowserAuth = {
  isLoginRequired: () => false,
  middleware: async () => NextResponse.next(),
  getSession: async () => null,
};

/**
 * Returns the auth adapter. The default build uses a no-op adapter so local
 * development and tests need no credentials.
 */
export function getBrowserAuth(): BrowserAuth {
  return stubAuth;
}

/**
 * GRD-AUTH-004: Minimal placeholder (no JSX file — keeps ts-jest on this package JSX-free).
 * gitreqd-cloud replaces this package with the full landing.
 */
export function UnauthenticatedLanding() {
  return React.createElement(
    "main",
    { className: "auth-gate" },
    React.createElement("h1", { className: "auth-gate-title" }, "gitreqd browser"),
    React.createElement("p", null, "Sign in to browse requirements in this project."),
    React.createElement(
      "p",
      null,
      React.createElement("a", { className: "auth-gate-link", href: "/auth/login" }, "Sign in")
    )
  );
}
