import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@gitreqd/browser-auth"],
  /** Monorepo root for this app (`gitreqd/`); avoids wrong inference when a parent repo has another lockfile. */
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
};

export default nextConfig;
