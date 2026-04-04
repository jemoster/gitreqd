import type { IncomingMessage } from "node:http";

/**
 * GRD-AUTH-003: Extension surface for attaching authentication outside core.
 * Implementations live in server integrations (e.g. CLI browser, Next.js);
 * `@gitreqd/core` does not perform verification itself.
 */

export type HttpAuthDecision =
  | { allow: true }
  | { allow: false; statusCode: number; message: string };

/**
 * Pluggable gate invoked before `/api/*` handling. Static routes (`/`, CSS) are not gated.
 */
export interface HttpServerAuthGate {
  authorizeApiRequest(req: IncomingMessage): Promise<HttpAuthDecision>;
}
