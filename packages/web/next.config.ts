import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Install root for this workspace (the `gitreqd` repo), not any parent checkout. */
const workspaceMonorepoRoot = path.join(__dirname, "..", "..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@gitreqd/browser-auth", "@gitreqd/browser-ui", "@gitreqd/browser-server"],
  outputFileTracingRoot: workspaceMonorepoRoot,
};

export default nextConfig;
